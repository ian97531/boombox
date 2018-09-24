import { IEpisode, IEpisodeDBRecord } from '../types/models'
import { buildProjectionExpression, dynamo, getItem, putItem } from './dynamo'
import { getPodcast } from './podcasts'

const EPISODE_PROJECTION = [
  'duration',
  'imageURL',
  'mp3URL',
  'podcastSlug',
  'publishedAt',
  'publishTimestamp',
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

export async function getEpisode(podcastSlug: string, publishTimestamp: number): Promise<IEpisode> {
  const key = { podcastSlug, publishTimestamp }
  const table = process.env.EPISODES_TABLE as string
  const response = await getItem(key, table, EPISODE_PROJECTION)
  return convertToIEpisode(response.Item as IEpisodeDBRecord)
}

export async function getEpisodes(
  podcastSlug: string,
  publishTimestamp: number,
  limit: number
): Promise<IEpisode[]> {
  const params: AWS.DynamoDB.DocumentClient.QueryInput = {
    ExpressionAttributeValues: {
      ':podcastSlug': podcastSlug,
      ':start': publishTimestamp,
    },
    KeyConditionExpression: 'podcastSlug = :podcastSlug and publishTimestamp >= :start',
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

  const data = (await dynamo.query(params).promise()) as AWS.DynamoDB.DocumentClient.QueryOutput
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
  const publishTimestamp = podcast.episodes[episodeSlug]

  return await getEpisode(podcastSlug, publishTimestamp)
}

export async function putEpisode(episode: IEpisode) {
  const Item = convertToIEpisodeDBRecord(episode)
  await putItem(Item, process.env.EPISODES_TABLE as string)
}
