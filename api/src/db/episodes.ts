import { IEpisode } from '@boombox/shared/types/models'
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

export async function getEpisodeForSlugs(
  podcastSlug: string,
  episodeSlug: string
): Promise<IEpisode> {
  const podcast = await getPodcast(podcastSlug)
  const episodeMap = JSON.parse(podcast.episodes)
  const publishTimestamp = episodeMap[episodeSlug]

  return await getEpisode(podcastSlug, publishTimestamp)
}
