import * as AWS from 'aws-sdk'

AWS.config.update({
  region: 'us-east-1',
})

export default new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-10-08',
})
