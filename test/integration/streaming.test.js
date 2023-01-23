import { describe, before, it } from 'mocha'
import { expect } from 'chai'
import ws from 'ws'
import delay from 'delay'

import { setupRealServer, setupKafka } from './helpers/setupHelper.js'
import { sendRawPayload } from './helpers/streamingHelper.js'
import env from '../../app/env.js'

const { KAFKA_EVENTS_NOTIFICATIONS_TOPIC, PORT } = env

const topic = KAFKA_EVENTS_NOTIFICATIONS_TOPIC

describe('Websockets', async function () {
  const context = { clients: [], streamedData: [] }

  afterEach(async () => {
    context.clients.forEach((client) => client.close())
    context.streamedData = []
    context.clients = []
  })

  setupKafka()
  setupRealServer(context)

  describe('Single client', async function () {
    before(async function () {
      this.timeout(10000)

      await new Promise((resolve) => {
        // Connect clients
        context.clients.push(
          new ws(`ws://localhost:${PORT}/v1/thing/123/event`)
            .on('open', () => {
              resolve()
            })
            .on('message', (msg) => {
              context.streamedData.push(Buffer.from(msg).toString())
            })
        )
      })

      // Broadcast messages
      await sendRawPayload(topic, {
        key: '123',
        value: JSON.stringify({
          event: {
            thingId: '123',
            type: 'type',
            timestamp: '2021-08-31T14:51:36.507Z',
            details: {},
          },
        }),
      })

      await delay(500)
    })

    it('should send the event to a single client', function () {
      expect(context.streamedData).to.have.length(1)
      expect(context.streamedData[0]).to.equal(
        JSON.stringify({ thingId: '123', type: 'type', timestamp: '2021-08-31T14:51:36.507Z', details: {} })
      )
    })
  })

  describe('Many clients', function () {
    const value = {
      event: {
        thingId: '123',
        type: 'type',
        timestamp: '2021-08-31T14:51:36.507Z',
        details: {},
      },
    }

    before(async function () {
      this.timeout(10000)

      await new Promise((resolve) => {
        let connectedCount = 0
        // Connect clients
        context.clients.push(
          new ws(`ws://localhost:${PORT}/v1/thing/123/event`)
            .on('open', () => {
              connectedCount++
              if (connectedCount === 2) {
                resolve()
              }
            })
            .on('message', (msg) => {
              context.streamedData.push(Buffer.from(msg).toString())
            }),
          new ws(`ws://localhost:${PORT}/v1/thing/123/event`)
            .on('open', () => {
              connectedCount++
              if (connectedCount === 2) {
                resolve()
              }
            })
            .on('message', (msg) => {
              context.streamedData.push(Buffer.from(msg).toString())
            })
        )
      })

      // Broadcast messages
      await sendRawPayload(topic, {
        key: '123',
        value: JSON.stringify(value),
      })
      await delay(500)
    })

    it('should send the event to many clients', function () {
      expect(context.clients).to.have.length(2)
      expect(context.streamedData).to.have.length(2)
      expect(JSON.parse(context.streamedData[0])).to.deep.equal(value.event)
      expect(JSON.parse(context.streamedData[1])).to.deep.equal(value.event)
    })
  })

  describe('Filter by event type', function () {
    let type
    let anotherType

    before(async function () {
      this.timeout(10000)
      type = 'eventType'
      anotherType = 'anotherType'

      await new Promise((resolve) => {
        // Connect clients
        context.clients.push(
          new ws(`ws://localhost:${PORT}/v1/thing/123/event/?type=${type}`)
            .on('open', () => {
              resolve()
            })
            .on('message', (msg) => {
              context.streamedData.push(Buffer.from(msg).toString())
            })
        )
      })

      // Broadcast messages
      await sendRawPayload(topic, {
        key: '123',
        value: JSON.stringify({
          event: {
            thingId: '123',
            type,
            timestamp: '2022-08-31T14:51:36.507Z',
            details: {},
          },
        }),
      })
      await sendRawPayload(topic, {
        key: '123',
        value: JSON.stringify({
          event: {
            thingId: '123',
            type: anotherType,
            timestamp: '2021-08-31T14:51:36.507Z',
            details: {},
          },
        }),
      })
      await delay(500)
    })

    it('should filter streamed events by queried type', function () {
      expect(context.clients).to.have.length(1)
      expect(context.streamedData).to.have.length(1)
      expect(JSON.parse(context.streamedData[0]).type).to.equal('eventType')
    })
  })

  describe('Filter by multiple event types', function () {
    let type
    let anotherType

    before(async function () {
      this.timeout(10000)
      type = 'eventType'
      anotherType = 'anotherType'

      await new Promise((resolve) => {
        // Connect clients
        context.clients.push(
          new ws(`ws://localhost:${PORT}/v1/thing/123/event/?type=${type}&type=${anotherType}`)
            .on('open', () => {
              resolve()
            })
            .on('message', (msg) => {
              context.streamedData.push(Buffer.from(msg).toString())
            })
        )
      })

      // Broadcast messages
      await sendRawPayload(topic, {
        key: '123',
        value: JSON.stringify({
          event: {
            thingId: '123',
            type,
            timestamp: '2022-08-31T14:51:36.507Z',
            details: {},
          },
        }),
      })
      await sendRawPayload(topic, {
        key: '123',
        value: JSON.stringify({
          event: {
            thingId: '123',
            type: anotherType,
            timestamp: '2021-08-31T14:51:36.507Z',
            details: {},
          },
        }),
      })
      await delay(500)
    })

    it('should filter streamed events by queried types', function () {
      expect(context.clients).to.have.length(1)
      expect(context.streamedData).to.have.length(2)
      context.streamedData.forEach((data) => {
        expect(JSON.parse(data).type).to.be.oneOf([type, anotherType])
      })
    })
  })
})
