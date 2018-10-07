import { IPodcast, IPodcastDBRecord } from '../types/models/podcast'
import { getItem, putItem } from './dynamo'

function convertToIPodcast(result: IPodcastDBRecord): IPodcast {
  const podcast: IPodcast = {
    ...result,
    createdAt: new Date(result.createdAt),
    episodes: JSON.parse(result.episodes),
    lastCheckedAt: new Date(result.lastCheckedAt),
    lastPublishedAt: new Date(result.lastPublishedAt),
  }
  return podcast
}

function convertToIPodcastDBRecord(podcast: IPodcast): IPodcastDBRecord {
  const result: IPodcastDBRecord = {
    ...podcast,
    createdAt: podcast.createdAt.toISOString(),
    episodes: JSON.stringify(podcast.episodes),
    lastCheckedAt: podcast.lastCheckedAt.toISOString(),
    lastPublishedAt: podcast.lastPublishedAt.toISOString(),
  }
  return result
}

export async function getPodcast(slug: string): Promise<IPodcast> {
  const response = await getItem({ slug }, process.env.PODCASTS_TABLE as string)
  return convertToIPodcast(response.Item as IPodcastDBRecord)
}

export async function putPodcast(
  podcast: IPodcast
): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> {
  const Item = convertToIPodcastDBRecord(podcast)
  return await putItem(Item, process.env.PODCASTS_TABLE as string)
}
