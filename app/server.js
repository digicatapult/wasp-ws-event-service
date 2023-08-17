import express from 'express'
import expressWS from 'express-ws'
import pinoHttp from 'pino-http'

import document from './api-v1/docs.js'
import env from './env.js'
import logger from './logger.js'
import setupEventsConsumer from './eventsConsumer.js'

const { PORT, WS_PING_INTERVAL_MS } = env

const clients = new Map()

const ipFromReq = (req) => {
  if (req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim()
  }
  return req.socket.remoteAddress
}

async function createHttpServer() {
  const expressWs = expressWS(express())
  const app = expressWs.app
  const requestLogger = pinoHttp({ logger })

  app.use((req, res, next) => {
    if (req.path !== '/health') requestLogger(req, res)
    next()
  })

  app.get('/health', async (req, res) => {
    res.status(200).send({ status: 'ok' })
  })

  app.get('/async-docs', async (req, res) => {
    const asyncApi = await document
    res.status(200).send(asyncApi)
  })

  app.ws(`/v1/thing/:thingId/event`, function (ws, req) {
    const ip = ipFromReq(req)
    logger.debug(`Connect established from %s`, ip)

    const { thingId } = req.params
    const { type } = req.query
    const keys = []

    if (Array.isArray(type)) {
      type.forEach((t) => {
        keys.push(JSON.stringify({ thingId, type: t }))
      })
    } else {
      keys.push(JSON.stringify({ thingId, type }))
    }

    keys.forEach((key) => {
      if (clients.has(key)) clients.get(key).add(ws)
      else clients.set(key, new Set().add(ws))
    })

    ws.on('message', (msg) => logger.info(msg))

    // setup a ping interval as there may an arbitrarily long delay between messages
    let isAlive = true
    ws.on('pong', () => {
      isAlive = true
    })
    const interval = setInterval(function wsHeartbeat() {
      if (!isAlive) ws.terminate()

      isAlive = false
      ws.ping('heartbeat')
    }, WS_PING_INTERVAL_MS)

    ws.on('close', () => {
      logger.debug(`Connection closed from ${ip}`)
      clearInterval(interval)

      keys.forEach((key) => {
        const set = clients.get(key)
        set.delete(ws)
        logger.debug(`${clients.get(key).size} clients remaining for ${key}`)
      })
    })
  })

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.status) {
      res.status(err.status).send({ error: err.status === 401 ? 'Unauthorised' : err.message })
    } else {
      logger.error('Fallback Error %j', err.stack)
      res.status(500).send('Fatal error!')
    }
  })

  const matchClients = (key, value) => {
    const matches = clients.get(key)

    if (matches) {
      logger.info(`${matches.size} matching clients for key: ${key}`)
      matches.forEach((client) => {
        if (client.OPEN) client.send(JSON.stringify(value))
        else client.close()
      })
    } else {
      logger.info(`No matching clients for key: ${key}`)
    }
  }

  const eventsConsumer = await setupEventsConsumer({
    forwardParams: (thingId, value) => {
      const key = JSON.stringify({ thingId })
      const event = value.event
      const type = event.type
      const keyWithType = JSON.stringify({ thingId, type })

      logger.info(`Broadcasting to ${key}`)
      logger.info(`Broadcasting to ${keyWithType}`)

      matchClients(key, event)
      matchClients(keyWithType, event)
    },
  })

  return { app, eventsConsumer }
}

/* istanbul ignore next */
async function startServer() {
  try {
    const { app, eventsConsumer } = await createHttpServer()

    const setupGracefulExit = ({ sigName, server, exitCode }) => {
      process.on(sigName, async () => {
        await eventsConsumer.disconnect()

        server.close(() => {
          process.exit(exitCode)
        })
      })
    }

    const server = await new Promise((resolve, reject) => {
      let resolved = false
      const server = app.listen(PORT, (err) => {
        if (err) {
          if (!resolved) {
            resolved = true
            reject(err)
          }
        }
        logger.info(`Listening on port ${PORT} `)
        if (!resolved) {
          resolved = true
          resolve(server)
        }
      })

      server.on('error', (err) => {
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })
    })

    setupGracefulExit({ sigName: 'SIGINT', server, exitCode: 0 })
    setupGracefulExit({ sigName: 'SIGTERM', server, exitCode: 143 })
  } catch (err) {
    logger.fatal('Fatal error during initialisation: %j', err)
    process.exit(1)
  }
}

export { startServer, createHttpServer }
