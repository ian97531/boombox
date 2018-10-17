import { ISpeaker } from '../types/models/transcript'
import { documentClient } from './dynamo'

export async function getSpeakers(slugs: string[]): Promise<ISpeaker[]> {
  const speakers: ISpeaker[] = []

  for (const slug of slugs) {
    const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
      Key: { slug },
      TableName: process.env.SPEAKERS_TABLE as string,
    }
    const response = (await documentClient
      .get(params)
      .promise()) as AWS.DynamoDB.DocumentClient.GetItemOutput

    speakers.push(response.Item as ISpeaker)
  }

  return speakers
}
