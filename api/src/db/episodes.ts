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
  console.log('getting podcast ' + podcastSlug)
  const podcast = await getPodcast(podcastSlug)
  console.log(podcast.episodes)
  const episodeMap = JSON.parse(podcast.episodes)
  console.log(episodeMap)
  const publishTimestamp = episodeMap[episodeSlug]

  console.log('getting episode with ' + podcastSlug + ' ' + publishTimestamp)
  return await getEpisode(podcastSlug, publishTimestamp)
}
