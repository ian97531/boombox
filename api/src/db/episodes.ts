import { IEpisode } from '../types/models'
import { default as dynamo } from './dynamo'

export async function getEpisode(guid: string): Promise<IEpisode> {
  const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
    Key: { guid },
    TableName: process.env.EPISODES_TABLE as string,
  }
  const response = (await dynamo
    .get(params)
    .promise()) as AWS.DynamoDB.DocumentClient.GetItemOutput

  return response.Item as IEpisode
}
