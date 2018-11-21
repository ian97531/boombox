import { buildProjectionExpression, documentClient, putItem } from './dynamo'
import { getEpisode, IEpisode } from './episodes'
import { getSpeakers, ISpeaker } from './speakers'

const STATEMENT_PROJECTION = ['startTime', 'endTime', 'speaker', 'words']

export interface IWord {
  startTime: number
  endTime: number
  content: string
  speaker: number
}

interface IStatementBase {
  startTime: number
  endTime: number
  speaker: ISpeaker | number
  words: IWord[]
}

export interface IStatement extends IStatementBase {
  speaker: ISpeaker
}

export interface IStatementDBRecord extends IStatementBase {
  speaker: number
}

export type ITranscript = IWord[]

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
  episode: IEpisode,
  statement: IStatementDBRecord
): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> {
  const episodeKey = buildEpisodeKey(episode.podcastSlug, episode.publishedAt)
  return await putItem({ ...statement, episodeKey }, process.env.STATEMENTS_TABLE as string)
}

const buildEpisodeKey = (podcastSlug: string, publishedAt: Date) => {
  return `${podcastSlug}_${publishedAt.toISOString()}`
}
