import { IPodcast } from '@boombox/shared/types/models'
import { default as dynamo } from './dynamo'

export async function getPodcast(slug: string): Promise<IPodcast> {
  const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
    Key: { slug },
    TableName: process.env.PODCASTS_TABLE as string,
  }
  const response = (await dynamo.get(params).promise()) as AWS.DynamoDB.DocumentClient.GetItemOutput

  return response.Item as IPodcast
}
