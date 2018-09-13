import { IEpisode } from '@boombox/shared/types/models'
import { IDBListResponse, IListQuery } from '../types/db'
import { default as dynamo } from './dynamo'
import { getPodcast } from './podcasts'

export async function getEpisode(podcastSlug: string, publishTimestamp: number): Promise<IEpisode> {
  const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
    Key: { podcastSlug, publishTimestamp },
    TableName: process.env.EPISODES_TABLE as string,
  }
  const response = (await dynamo.get(params).promise()) as AWS.DynamoDB.DocumentClient.GetItemOutput

  return response.Item as IEpisode
}

export async function getEpisodes(
  podcastSlug: string,
  query: IListQuery
): Promise<IDBListResponse<IEpisode>> {
  const params: AWS.DynamoDB.DocumentClient.QueryInput = {
    ExpressionAttributeNames: {
      '#duration': 'duration',
    },
    ExpressionAttributeValues: {
      ':podcastSlug': podcastSlug,
      ':start': query.start,
    },
    KeyConditionExpression: 'podcastSlug = :podcastSlug and publishTimestamp >= :start',
    Limit: query.pageSize + 1,
    ProjectionExpression:
      'podcastSlug, publishTimestamp, slug, title, summary, imageURL, ' +
      'mp3URL, #duration, totalStatements, publishedAt, speakers',
    TableName: process.env.EPISODES_TABLE as string,
  }

  const data = (await dynamo.query(params).promise()) as AWS.DynamoDB.DocumentClient.QueryOutput
  const items: IEpisode[] = data ? (data.Items as IEpisode[]) : []
  console.log(data)
  console.log(items)
  const response: IDBListResponse<IEpisode> = {
    items: [],
  }

  if (items.length === query.pageSize + 1) {
    response.items = items.slice(0, query.pageSize)
    response.nextItem = items[items.length - 1].publishTimestamp
  } else {
    response.items = items
  }
  console.log(response)
  return response
}

export async function getEpisodeForSlugs(
  podcastSlug: string,
  episodeSlug: string
): Promise<IEpisode> {
  const podcast = await getPodcast(podcastSlug)
  const publishTimestamp = podcast.episodes[episodeSlug]

  return await getEpisode(podcastSlug, publishTimestamp)
}
