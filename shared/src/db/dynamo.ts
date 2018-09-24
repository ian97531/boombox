import * as AWS from 'aws-sdk'
import * as reservedWords from './reservedWords'

AWS.config.update({
  region: 'us-east-1',
})

export const dynamo = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-10-08',
})

export async function putItem(
  Item: any,
  TableName: string
): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> {
  console.log(
    'Putting item into dynamodb table "' + TableName + '": ',
    JSON.stringify(Item, null, 2)
  )
  const params: AWS.DynamoDB.DocumentClient.PutItemInput = { Item, TableName }
  const response = await dynamo.put(params).promise()
  console.log('Completed putting item into dynamodb table "' + TableName + '".')
  return response
}

export function buildProjectionExpression(projection: string[] = []) {
  const ProjectionExpression = []
  const ExpressionAttributeNames = {}
  for (const word in projection) {
    if (word in reservedWords) {
      const hashWord = '#' + word
      ExpressionAttributeNames[hashWord] = word
      ProjectionExpression.push(hashWord)
    } else {
      ProjectionExpression.push(word)
    }
  }

  return { ExpressionAttributeNames, ProjectionExpression }
}

export async function getItem(
  Key: { [id: string]: any },
  TableName: string,
  projection: string[] = []
): Promise<AWS.DynamoDB.DocumentClient.GetItemOutput> {
  console.log('Retrieving item from dynamodb table "' + TableName + '" for key: ', Key)
  const params: AWS.DynamoDB.DocumentClient.GetItemInput = { Key, TableName }

  // If a projection was provided, prepare it for dynamo.
  const projectionParams = buildProjectionExpression(projection)
  if (projectionParams.ProjectionExpression.length) {
    params.ProjectionExpression = projectionParams.ProjectionExpression.join(', ')
    if (Object.keys(projectionParams.ExpressionAttributeNames).length) {
      params.ExpressionAttributeNames = projectionParams.ExpressionAttributeNames
    }
  }
  // Query the Database
  const response = (await dynamo.get(params).promise()) as AWS.DynamoDB.DocumentClient.GetItemOutput
  console.log('Retrieved item: ', JSON.stringify(response.Item, null, 2))
  return response
}
