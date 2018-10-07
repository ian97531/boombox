import { IJob, IJobDBRecord } from '../types/models/job'
import { getItem, putItem } from './dynamo'

function convertToIJob(result: IJobDBRecord): IJob {
  const job: IJob = {
    ...result,
    publishedAt: new Date(result.publishedAt),
    startTime: new Date(result.startTime),
  }
  return job
}

function convertToIJobDBRecord(job: IJob): IJobDBRecord {
  const result: IJobDBRecord = {
    ...job,
    publishedAt: job.publishedAt.toISOString(),
    startTime: job.startTime.toISOString(),
  }
  return result
}

export async function getJob(startTime: string): Promise<IJob> {
  const response = await getItem({ startTime }, process.env.JOBS_TABLE as string)
  return convertToIJob(response.Item as IJobDBRecord)
}

export async function putJob(job: IJob): Promise<AWS.DynamoDB.DocumentClient.PutItemOutput> {
  const Item = convertToIJobDBRecord(job)
  return await putItem(Item, process.env.JOBS_TABLE as string)
}
