import { getProducer } from './setupHelper.js'

export const sendRawPayload = async (topic, message) => {
  const producer = getProducer()

  const messageSent = await producer.send({
    topic,
    messages: [message],
  })
  return messageSent
}
