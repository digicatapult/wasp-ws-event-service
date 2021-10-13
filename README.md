# wasp-ws-event-service

WebSocket connection for the [wasp-event-service](https://github.com/digicatapult/wasp-event-service).

## Getting started

`wasp-ws-event-service` can be run in a similar way to most nodejs applications. First install required dependencies using `npm`:

```sh
npm install
```

`wasp-ws-event-service` depends on `Kafka` which can be brought locally up using docker:

```sh
docker-compose up -d
```

And finally you can run the application in development mode with:

```sh
npm run dev
```

Or run tests with:

```sh
npm test
```

## Environment Variables

`wasp-ws-event-service` is configured primarily using environment variables as follows:

| variable                        | required | default             | description                                                                                         |
| :-----------------------------: | :------: | :-----------------: | :-------------------------------------------------------------------------------------------------: |
| LOG_LEVEL                       |    N     | `       info`       | Logging level. Valid values are [`trace`, `debug`, `info`, `warn`, `error`, `fatal`]                |
| PORT                            |    N     |         `80`        | Port on which the service will listen                                                               |
| API_MAJOR_VERSION               |    N     |         `v1`        | Major version of this service                                                                       |
| KAFKA_LOG_LEVEL                 |    N     |      `nothing`      | Log level to use for the Kafka connection. Choices are 'debug', 'info', 'warn', 'error' or 'nothing'|
| KAFKA_BROKERS                   |    N     |  `localhost:9092`   | Comma separated List of Kafka brokers to connect to                                                 |
| KAFKA_EVENTS_NOTIFICATIONS_TOPIC|    N     |`event-notifications`| Incoming Kafka topic for events                                                                     |
| WS_PING_INTERVAL_MS             |    N     |        500          | Ping interval in milliseconds to keep WebSocket connection alive                                    |