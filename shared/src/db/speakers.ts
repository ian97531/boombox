import { default as dynamo } from 'db/dynamo'
import { ISpeaker } from 'types/models'

export async function getSpeakers(slugs: string[]): Promise<ISpeaker[]> {
  const speakers: ISpeaker[] = []

  for (const slug of slugs) {
    const params: AWS.DynamoDB.DocumentClient.GetItemInput = {
      Key: { slug },
      TableName: process.env.SPEAKERS_TABLE as string,
    }
    const response = (await dynamo
      .get(params)
      .promise()) as AWS.DynamoDB.DocumentClient.GetItemOutput

    speakers.push(response.Item as ISpeaker)
  }

  return speakers
}
