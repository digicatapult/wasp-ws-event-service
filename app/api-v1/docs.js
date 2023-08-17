import { Parser } from '@asyncapi/parser'
const parser = new Parser()
import { version } from '../version.js'

const { document } = await parser.parse(`
asyncapi: 2.1.0
info:
  title: WASP Web Sockets Event Service
  version: ${version}
  description: 'Subscribe to event updates for specific things.'
  license:
    name: Apache 2.0
    url: 'https://www.apache.org/licenses/LICENSE-2.0'
servers:
  public:
    url: 'http://localhost:{port}/v1'
    protocol: wss
    description: 'Public server available without authorization. Once the socket is open you can subscribe to a public channel by sending a subscribe request message. Authentication/authorization is handled at the cluster level.'
    variables:
      port:
        description: 'Websocket connection is available through port 3000.'
        default: '3000'
defaultContentType: application/json
channels:
  'thing/{thingId}/event':
    description: 'The topic on which events may be produced and consumed.'
    parameters:
      thingId:
        $ref: '#/components/parameters/thingId'
    subscribe:
      summary: >-
        Receive information about a particular thing's events.
      operationId: receiveEvent
      message:
        $ref: '#/components/messages/event'
components:
  messages:
    event:
      name: event
      title: Event
      summary: >-
        JSON payload for a specific event.
      contentType: application/json
      payload:
        $ref: '#/components/schemas/eventPayload'
  schemas:
    eventPayload:
      type: object
      properties:
        thingId:
          type: string
          description: 'The ID of the thing.'
          example: '273d814a-e115-4b88-b264-bb2033de21f7'
        type:
          type: string
          description: 'Type of the event.'
          example: 'BUTTON_PRESSED'
        timestamp:
          type: string
          format: date-time
          description: 'Timestamp of event.'
          example: '2021-09-22T07:59:35.925Z'
        details:
          type: object
          description: 'Catch-all for any other thing-specific event data'
  parameters:
    thingId:
      description: 'The ID of the thing.'
      schema:
        type: string
        `)

export default document
