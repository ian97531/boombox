import { IEpisode, IEpisodeDBRecord } from '../types/models/episode'
import { buildProjectionExpression, documentClient, getItem, putItem } from './dynamo'
import { getPodcast } from './podcasts'

const EPISODE_PROJECTION = [
  'bytes',
  'duration',
  'imageURL',
  'mp3URL',
  'podcastSlug',
  'publishedAt',
  'slug',
  'speakers',
  'summary',
  'title',
  'totalStatements',
]

function convertToIEpisode(result: IEpisodeDBRecord): IEpisode {
  const episode: IEpisode = {
    ...result,
    publishedAt: new Date(result.publishedAt),
  }
  return episode
}

function convertToIEpisodeDBRecord(episode: IEpisode): IEpisodeDBRecord {
  const result: IEpisodeDBRecord = {
    ...episode,
    publishedAt: episode.publishedAt.toISOString(),
  }
  return result
}

export async function getEpisode(podcastSlug: string, publishedAt: Date): Promise<IEpisode> {
  const publishedAtKey = publishedAt.toISOString()
  const key = { podcastSlug, publishedAt: publishedAtKey }
  const table = process.env.EPISODES_TABLE as string
  const response = await getItem(key, table, EPISODE_PROJECTION)
  return convertToIEpisode(response.Item as IEpisodeDBRecord)
}

export async function getEpisodes(
  podcastSlug: string,
  publishedAt: Date,
  limit: number
): Promise<IEpisode[]> {
  const publishedAtKey = publishedAt.toISOString()
  const params: AWS.DynamoDB.DocumentClient.QueryInput = {
    ExpressionAttributeValues: {
      ':podcastSlug': podcastSlug,
      ':start': publishedAtKey,
    },
    KeyConditionExpression: 'podcastSlug = :podcastSlug and publishedAt >= :start',
    Limit: limit,
    TableName: process.env.EPISODES_TABLE as string,
  }

  const projectionParams = buildProjectionExpression(EPISODE_PROJECTION)
  if (projectionParams.ProjectionExpression.length) {
    params.ProjectionExpression = projectionParams.ProjectionExpression.join(', ')
    if (Object.keys(projectionParams.ExpressionAttributeNames).length) {
      params.ExpressionAttributeNames = projectionParams.ExpressionAttributeNames
    }
  }

  const data = (await documentClient
    .query(params)
    .promise()) as AWS.DynamoDB.DocumentClient.QueryOutput
  const episodes: IEpisode[] = []
  for (const item of data.Items as IEpisodeDBRecord[]) {
    episodes.push(convertToIEpisode(item))
  }

  return episodes
}

export async function getEpisodeForSlugs(
  podcastSlug: string,
  episodeSlug: string
): Promise<IEpisode> {
  const podcast = await getPodcast(podcastSlug)
  const publishedAt = new Date(podcast.episodes[episodeSlug])

  return await getEpisode(podcastSlug, publishedAt)
}

export async function putEpisode(
  episode: IEpisode
): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> {
  const Item = convertToIEpisodeDBRecord(episode)
  return await putItem(Item, process.env.EPISODES_TABLE as string)
}
