import { ISpeaker } from '@boombox/shared/types/models'
import { default as dynamo } from './dynamo'

export async function getSpeakers(guids: string[]): Promise<ISpeaker[]> {
  const speakers: ISpeaker[] = []

  for (const guid of guids) {
    const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
      Key: { guid },
      TableName: process.env.SPEAKERS_TABLE as string,
    }
    const response = (await dynamo
      .get(params)
      .promise()) as AWS.DynamoDB.DocumentClient.GetItemOutput

    speakers.push(response.Item as ISpeaker)
  }

  return speakers
}
