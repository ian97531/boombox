import { getItem, putItem } from '@boombox/shared/src/db/dynamo'
import { IJob } from './Job'

export async function getJob(startTime: string): Promise<IJob> {
  const response = await getItem({ startTime }, process.env.JOBS_TABLE as string)
  return response.Item as IJob
}

export async function putJob(job: IJob): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> {
  return await putItem(job, process.env.JOBS_TABLE as string)
}
