import { db } from '@boombox/shared'
import { IJob } from './Job'

export async function getJob(startTime: string): Promise<IJob> {
  const response = await db.dynamo.getItem({ startTime }, process.env.JOBS_TABLE as string)
  return response.Item as IJob
}

export async function putJob(job: IJob): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> {
  return await db.dynamo.putItem(job, process.env.JOBS_TABLE as string)
}
