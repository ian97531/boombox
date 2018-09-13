import { IStatementDBResult } from '@boombox/shared/types/models'
import { IDBListResponse, ITimedListQuery } from '../types/db'
import { default as dynamo } from './dynamo'

export async function getStatements(
  podcastSlug: string,
  publishedAt: number,
  query: ITimedListQuery
): Promise<IDBListResponse<IStatementDBResult>> {
  const episodeKey = podcastSlug + '_' + publishedAt.toString()
  const params: AWS.DynamoDB.DocumentClient.QueryInput = {
    ExpressionAttributeValues: {
      ':episodeKey': episodeKey,
      ':startTime': query.startTime,
    },
    KeyConditionExpression: 'episodeKey = :episodeKey and endTime > :startTime',
    Limit: query.pageSize + 1,
    ProjectionExpression: 'startTime, endTime, speaker, words',
    TableName: process.env.STATEMENTS_TABLE as string,
  }

  const data = (await dynamo.query(params).promise()) as AWS.DynamoDB.DocumentClient.QueryOutput

  let items: IStatementDBResult[] = data ? (data.Items as IStatementDBResult[]) : []
  let moreResults = false
  if (items.length === query.pageSize + 1) {
    items = items.slice(0, query.pageSize)
    moreResults = true
  }
  return { moreResults, items }
}
