const { Kafka, logLevel: kafkaLogLevels } = require('kafkajs')
const request = require('supertest')
const { before, after } = require('mocha')

const { KAFKA_BROKERS, KAFKA_EVENTS_NOTIFICATIONS_TOPIC, PORT } = require('../../../app/env')
const { createHttpServer } = require('../../../app/server')

const setupServer = (context) => {
  before(async function () {
    this.timeout(30000)
    this.slow(10000)

    const server = await createHttpServer()
    const apiObj = { server, request: request(server.app), eventsConsumer: server.eventsConsumer }

    Object.assign(context, apiObj)
  })

  after(async function () {
    this.timeout(10000)
    await context.eventsConsumer.disconnect()
  })
}

const setupRealServer = (context) => {
  before(async function () {
    this.timeout(30000)
    this.slow(10000)

    const { app, eventsConsumer } = await createHttpServer()
    const server = await new Promise((resolve, reject) => {
      let resolved = false
      const server = app.listen(PORT, (err) => {
        if (err) {
          if (!resolved) {
            resolved = true
            reject(err)
          }
        }
        if (!resolved) {
          resolved = true
          resolve(server)
        }
      })
    })

    const apiObj = { server, eventsConsumer }

    Object.assign(context, apiObj)
  })

  after(async function () {
    this.timeout(10000)
    await context.eventsConsumer.disconnect()

    await new Promise((res, rej) => {
      try {
        context.server.close(() => {
          res()
        })
      } catch (err) {
        rej(err)
      }
    })
  })
}

let producer = null
const setupKafka = () => {
  before(async function () {
    this.timeout(30000)

    const kafka = new Kafka({
      clientId: 'test-streaming-service',
      brokers: KAFKA_BROKERS,
      logLevel: kafkaLogLevels.NOTHING,
    })

    producer = kafka.producer()
    await producer.connect()

    const rawConsumer = kafka.consumer({ groupId: 'test-streaming-service' })
    await rawConsumer.connect()
    await rawConsumer.subscribe({ topic: KAFKA_EVENTS_NOTIFICATIONS_TOPIC, fromBeginning: false })

    const messages = []
    await rawConsumer.run({
      eachMessage: async ({ message: { key, value } }) => {
        messages.push({ key: key.toString('utf8'), value: JSON.parse(value.toString('utf8')) })
      },
    })
  })

  after(async function () {
    this.timeout(30000)

    await Promise.all([producer.disconnect()])
    producer = null
  })
}

const getProducer = () => {
  if (producer === null) {
    throw new Error('Tried to get test producer whilst not instantiated')
  } else {
    return producer
  }
}

module.exports = {
  setupServer,
  setupRealServer,
  setupKafka,
  getProducer,
}
