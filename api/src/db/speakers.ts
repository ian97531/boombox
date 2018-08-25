import { ISpeaker } from '../types/models'
import { default as dynamo } from './dynamo'

export async function getSpeakers(guids: string[]): Promise<ISpeaker[]> {
  const speakers: ISpeaker[] = []

  for (const guid of guids) {
    const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
      Key: { guid },
      TableName: 'boombox-pipeline-ian-speakers',
    }
    const response = (await dynamo
      .get(params)
      .promise()) as AWS.DynamoDB.DocumentClient.GetItemOutput

    speakers.push(response.Item as ISpeaker)
  }

  return speakers
}
