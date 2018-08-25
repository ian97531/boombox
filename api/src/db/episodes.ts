import { IEpisode } from '../types/models'
import { default as dynamo } from './dynamo'

export async function getEpisode(guid: string): Promise<IEpisode> {
  const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
    Key: { guid },
    TableName: 'boombox-pipeline-ian-episodes',
  }
  const response = (await dynamo
    .get(params)
    .promise()) as AWS.DynamoDB.DocumentClient.GetItemOutput

  return response.Item as IEpisode
}
