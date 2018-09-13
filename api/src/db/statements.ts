import { IStatementDBResult } from '@boombox/shared/types/models'
import { IDBListResponse, IListQuery } from '../types/db'
import { default as dynamo } from './dynamo'

export async function getStatements(
  podcastSlug: string,
  publishedAt: number,
  query: IListQuery
): Promise<IDBListResponse<IStatementDBResult>> {
  const episodeKey = podcastSlug + '_' + publishedAt.toString()
  const params: AWS.DynamoDB.DocumentClient.QueryInput = {
    ExpressionAttributeValues: {
      ':episodeKey': episodeKey,
      ':start': query.start,
    },
    KeyConditionExpression: 'episodeKey = :episodeKey and endTime >= :start',
    Limit: query.pageSize + 1,
    ProjectionExpression: 'startTime, endTime, speaker, words',
    TableName: process.env.STATEMENTS_TABLE as string,
  }

  const data = (await dynamo.query(params).promise()) as AWS.DynamoDB.DocumentClient.QueryOutput
  const items: IStatementDBResult[] = data ? (data.Items as IStatementDBResult[]) : []
  const response: IDBListResponse<IStatementDBResult> = {
    items: [],
  }

  if (items.length === query.pageSize + 1) {
    response.items = items.slice(0, query.pageSize)
    response.nextItem = items[items.length - 1].endTime
  } else {
    response.items = items
  }
  return response
}
