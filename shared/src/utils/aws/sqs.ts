import * as AWS from 'aws-sdk'

const sqs = new AWS.SQS()

export const sendSQSMessage = async <T>(message: T, QueueUrl: string, DelaySeconds: number = 0) => {
  if (DelaySeconds) {
    console.log(
      `Sending sqs message with a ${DelaySeconds} second delay to ${QueueUrl} with payload: `
    )
  } else {
    console.log(`Sending message with no delay to ${QueueUrl} with payload: `)
  }
  console.log(JSON.stringify(message, null, 2))

  const params: AWS.SQS.SendMessageRequest = {
    DelaySeconds,
    MessageBody: JSON.stringify(message || {}),
    QueueUrl,
  }
  await sqs.sendMessage(params).promise()
}
