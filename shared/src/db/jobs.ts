import { IJob, IJobDBRecord } from '../types/models'
import { getItem, putItem } from './dynamo'

function convertToIJob(result: IJobDBRecord): IJob {
  const job: IJob = {
    ...result,
    startTime: new Date(result.startTime),
  }
  return job
}

function convertToIJobDBRecord(job: IJob): IJobDBRecord {
  const result: IJobDBRecord = {
    ...job,
    startTime: job.startTime.toISOString(),
  }
  return result
}

export async function getJob(startTime: string): Promise<IJob> {
  const response = await getItem({ startTime }, process.env.JOBS_TABLE as string)
  return convertToIJob(response.Item as IJobDBRecord)
}

export async function putJob(job: IJob): Promise<void> {
  const Item = convertToIJobDBRecord(job)
  await putItem(Item, process.env.JOBS_TABLE as string)
}
