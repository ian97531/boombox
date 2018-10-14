import { ISpeaker, IStatement, IStatementDBRecord } from '../types/models/transcript'
import { buildProjectionExpression, documentClient, putItem } from './dynamo'
import { getEpisode } from './episodes'
import { getSpeakers } from './speakers'

const STATEMENT_PROJECTION = ['startTime', 'endTime', 'speaker', 'words']

const convertToIStatement = (result: IStatementDBRecord, speakers: ISpeaker[]): IStatement => {
  const statement: IStatement = {
    ...result,
    speaker: speakers[result.speaker],
  }
  return statement
}

export async function getStatements(
  podcastSlug: string,
  publishedAt: Date,
  startTime: number,
  limit: number
): Promise<IStatement[]> {
  const episode = await getEpisode(podcastSlug, publishedAt)
  const speakers = await getSpeakers(episode.speakers)

  const episodeKey = podcastSlug + '_' + publishedAt.toISOString()
  const params: AWS.DynamoDB.DocumentClient.QueryInput = {
    ExpressionAttributeValues: {
      ':episodeKey': episodeKey,
      ':start': startTime,
    },
    KeyConditionExpression: 'episodeKey = :episodeKey and endTime >= :start',
    Limit: limit,
    ProjectionExpression: 'startTime, endTime, speaker, words',
    TableName: process.env.STATEMENTS_TABLE as string,
  }

  const projectionParams = buildProjectionExpression(STATEMENT_PROJECTION)
  if (projectionParams.ProjectionExpression.length) {
    params.ProjectionExpression = projectionParams.ProjectionExpression.join(', ')
    if (Object.keys(projectionParams.ExpressionAttributeNames).length) {
      params.ExpressionAttributeNames = projectionParams.ExpressionAttributeNames
    }
  }

  const data = (await documentClient
    .query(params)
    .promise()) as AWS.DynamoDB.DocumentClient.QueryOutput
  const statements: IStatement[] = []
  for (const item of data.Items as IStatementDBRecord[]) {
    statements.push(convertToIStatement(item, speakers))
  }

  return statements
}

export async function putIStatmentDBRecord(
  statement: IStatementDBRecord
): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> {
  return await putItem(statement, process.env.STATEMENTS_TABLE as string)
}
