import { IDBListResponse, ITimedListQuery } from '../types/db'
import { IStatementDBResult } from '../types/models'
import { default as dynamo } from './dynamo'

export async function getStatements(
  query: ITimedListQuery
): Promise<IDBListResponse<IStatementDBResult>> {
  const params: AWS.DynamoDB.DocumentClient.QueryInput = {
    ExpressionAttributeValues: {
      ':guid': query.guid,
      ':startTime': query.startTime,
    },
    KeyConditionExpression: 'guid = :guid and endTime > :startTime',
    Limit: query.pageSize + 1,
    ProjectionExpression: 'startTime, endTime, speaker, words',
    TableName: process.env.STATEMENTS_TABLE as string,
  }

  const data = (await dynamo
    .query(params)
    .promise()) as AWS.DynamoDB.DocumentClient.QueryOutput

  let items: IStatementDBResult[] = data
    ? (data.Items as IStatementDBResult[])
    : []
  let moreResults = false
  if (items.length === query.pageSize + 1) {
    items = items.slice(0, query.pageSize)
    moreResults = true
  }
  return { moreResults, items }
}
