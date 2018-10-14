import * as AWS from 'aws-sdk'
import { sleep } from '../utils/timing'
import { RESERVED_WORDS } from './reservedWords'

const DEFAULT_TIMEOUT_MS = 10000 // 10 seconds
const WAIT_TIME = 1000 // 1 second

AWS.config.update({
  region: 'us-east-1',
})

export const documentClient = new AWS.DynamoDB.DocumentClient()

export const buildProjectionExpression = (projection: string[] = []) => {
  const ProjectionExpression: string[] = []
  const ExpressionAttributeNames: { [key: string]: string } = {}
  for (const word of projection) {
    if (RESERVED_WORDS.indexOf(word.toUpperCase()) !== -1) {
      const hashWord = '#' + word
      ExpressionAttributeNames[hashWord] = word
      ProjectionExpression.push(hashWord)
    } else {
      ProjectionExpression.push(word)
    }
  }

  return { ExpressionAttributeNames, ProjectionExpression }
}

export const getItem = async (
  Key: { [id: string]: any },
  TableName: string,
  projection: string[] = [],
  timeoutMilliseconds: number = DEFAULT_TIMEOUT_MS
): Promise<AWS.DynamoDB.DocumentClient.GetItemOutput> => {
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
  let response: AWS.DynamoDB.DocumentClient.GetItemOutput | undefined
  let timedOut = false
  const startTime = Date.now()
  while (!response && !timedOut) {
    try {
      response = await documentClient.get(params).promise()
    } catch (error) {
      if (error.name === 'ProvisionedThroughputExceededException') {
        console.log(`Get from table ${TableName} has been throttled by dynamodb`)
        await sleep(WAIT_TIME)
      } else {
        console.error(`Error while fetching item with params: ${JSON.stringify(params, null, 2)}`)
        throw error
      }
    }

    timedOut = Date.now() - startTime > timeoutMilliseconds
  }

  if (!response) {
    throw Error(`Timed out while fetching the following params: ${params}`)
  }

  return response
}

export const getObject = async <T>(
  Key: { [id: string]: any },
  TableName: string,
  projection: string[] = []
): Promise<T> => {
  const response = await getItem(Key, TableName, projection)
  if (response.Item) {
    return response.Item as T
  } else {
    throw Error(`Item for Key: ${Key} not found in table: ${TableName}.`)
  }
}

export const putItem = async <T>(
  Item: T,
  TableName: string,
  timeoutMilliseconds: number = DEFAULT_TIMEOUT_MS
): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> => {
  const params: AWS.DynamoDB.DocumentClient.PutItemInput = { Item, TableName }
  let response: AWS.DynamoDB.DocumentClient.PutItemOutput | undefined
  let timedOut = false
  const startTime = Date.now()
  while (!response && !timedOut) {
    try {
      response = await documentClient.put(params).promise()
    } catch (error) {
      if (error.name === 'ProvisionedThroughputExceededException') {
        console.log(`Put into table ${TableName} has been throttled by dynamodb`)
        await sleep(WAIT_TIME)
      } else {
        console.error(`Error while putting item with params: ${JSON.stringify(params, null, 2)}`)
        throw error
      }
    }

    timedOut = Date.now() - startTime > timeoutMilliseconds
  }

  if (!response) {
    throw Error(`Timed out while fetching the following params: ${params}`)
  }

  return response
}
