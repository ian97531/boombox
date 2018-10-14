import * as AWS from 'aws-sdk'
import { sleep } from '../utils/timing'
import { RESERVED_WORDS } from './reservedWords'

AWS.config.update({
  region: 'us-east-1',
})

const dynamo = new AWS.DynamoDB()
export const documentClient = new AWS.DynamoDB.DocumentClient()

interface ITransaction {
  timestamp: number
  consumed: number
}

interface ICapacityRecord {
  capacityUnits: number
  transactions: ITransaction[]
}

interface ITableCapacityRecord {
  read: ICapacityRecord
  write: ICapacityRecord
}

type DocumentClientResponse =
  | AWS.DynamoDB.DocumentClient.GetItemOutput
  | AWS.DynamoDB.DocumentClient.PutItemOutput

const TABLE_CAPACITY_MAP: { [key: string]: ITableCapacityRecord } = {}
const DEFAULT_TRANSACTION_MAX_AGE = 2 * 60 // 2 minutes
const DEFAULT_TIMEOUT_MS = 5 * 1000 // 5 seconds
const WAIT_TIME = 1 * 1000 // 1 second

const createCapacityRecord = (rcu: number = 1, wcu: number = 1): ITableCapacityRecord => {
  return {
    read: {
      capacityUnits: rcu,
      transactions: [],
    },
    write: {
      capacityUnits: wcu,
      transactions: [],
    },
  }
}

const getTableCapacity = async (TableName: string) => {
  if (TABLE_CAPACITY_MAP[TableName] === undefined) {
    try {
      const params = { TableName }
      const response = await dynamo.describeTable(params).promise()
      if (response.Table && response.Table.ProvisionedThroughput) {
        const throughput = response.Table.ProvisionedThroughput
        TABLE_CAPACITY_MAP[TableName] = createCapacityRecord(
          throughput.ReadCapacityUnits,
          throughput.WriteCapacityUnits
        )
      } else {
        console.error(
          `Unable to find the provisionedThroughputCapacity for ${TableName}. Defaulting to 1 RCU and 1 WCU.`
        )
      }
    } catch (error) {
      console.error(
        `Exception thrown when requesting describeTable for ${TableName}: ${error.stack}`
      )
    }
  }

  if (TABLE_CAPACITY_MAP[TableName] === undefined) {
    TABLE_CAPACITY_MAP[TableName] = createCapacityRecord()
  }

  return TABLE_CAPACITY_MAP[TableName]
}

const bytesInString = (str: string): number => {
  // returns the byte length of an utf8 string
  let bytes = str.length
  for (let index = str.length - 1; index >= 0; index--) {
    const code = str.charCodeAt(index)
    if (code > 0x7f && code <= 0x7ff) {
      bytes++
    } else if (code > 0x7ff && code <= 0xffff) {
      bytes += 2
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      index--
    }
  }
  return bytes
}

const isCapacityAvailable = (
  record: ICapacityRecord,
  messageObject?: any,
  maxAge: number = DEFAULT_TRANSACTION_MAX_AGE
): boolean => {
  const recent: ITransaction[] = []
  const now = Date.now()
  let recentCapacityUsed = 0
  for (const transaction of record.transactions) {
    const age = now - transaction.timestamp
    if (age <= maxAge) {
      recent.push(transaction)
      recentCapacityUsed += transaction.consumed
    }
  }
  record.transactions = recent
  const totalCapacity = record.capacityUnits * maxAge
  const capacityAvailable = totalCapacity - recentCapacityUsed
  if (messageObject) {
    const messageString = JSON.stringify(messageObject)
    const kbInMessage = bytesInString(messageString) / 1024
    const capacityNeeded = Math.ceil(kbInMessage)
    return capacityAvailable >= capacityNeeded
  } else {
    return capacityAvailable > 0
  }
}

const recordCapacityUsage = (response: DocumentClientResponse, record: ICapacityRecord): void => {
  let consumed = 1
  if (response.ConsumedCapacity && response.ConsumedCapacity.CapacityUnits) {
    consumed = response.ConsumedCapacity.CapacityUnits
  }
  record.transactions.push({
    consumed,
    timestamp: Date.now(),
  })
}

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
  const capacityRecord = await getTableCapacity(TableName)

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
    if (isCapacityAvailable(capacityRecord.read)) {
      try {
        response = await documentClient.get(params).promise()
        recordCapacityUsage(response, capacityRecord.read)
      } catch (error) {
        if (error.name === 'ThrottlingException') {
          console.log(`Get from table ${TableName} has been throttled by dynamodb`)
          await sleep(WAIT_TIME)
        } else {
          console.error(`Error while fetching an item with the following params: ${params}`)
          console.error(error.stack)
          throw error
        }
      }
    } else {
      console.log(`Get from table ${TableName} has been delayed to avoid throttling.`)
      await sleep(WAIT_TIME)
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
  const capacityRecord = await getTableCapacity(TableName)

  const params: AWS.DynamoDB.DocumentClient.PutItemInput = { Item, TableName }

  let response: AWS.DynamoDB.DocumentClient.PutItemOutput | undefined
  let timedOut = false
  const startTime = Date.now()
  while (!response && !timedOut) {
    if (isCapacityAvailable(capacityRecord.write, Item)) {
      try {
        response = await documentClient.put(params).promise()
        recordCapacityUsage(response, capacityRecord.write)
        console.log(`Completed putting item into dynamodb table ${TableName}.`)
      } catch (error) {
        if (error.name === 'ThrottlingException') {
          console.log(`Put into table ${TableName} has been throttled by dynamodb`)
          await sleep(WAIT_TIME)
        } else {
          console.error(`Error while putting an item with the following params: ${params}`)
          console.error(error.message)
          throw error
        }
      }
    } else {
      console.log(`Put into table ${TableName} has been delayed to avoid throttling.`)
      await sleep(WAIT_TIME)
    }
    const now = Date.now()
    timedOut = now - startTime > timeoutMilliseconds
  }

  if (!response) {
    throw Error(`Timed out while fetching the following params: ${params}`)
  }

  return response
}
