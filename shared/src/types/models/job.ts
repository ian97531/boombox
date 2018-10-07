export enum JOB_STATUS {
  UNSTARTED = 'UNSTARTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  RETRYING = 'RETRYING',
}

export interface IJobStatusUpdate {
  endTime?: string
  status: JOB_STATUS
  error?: string
  output?: any
}

export interface IJobStatus extends IJobStatusUpdate {
  startTime: string
}

interface IJobBase {
  startTime: string | Date
  podcastSlug: string
  episodeSlug: string
  publishedAt: string | Date
  status: JOB_STATUS
  lambdas: {
    [key: string]: IJobStatus
  }
  info: any
}
export interface IJob extends IJobBase {
  publishedAt: Date
  startTime: Date
}

export interface IJobDBRecord extends IJobBase {
  publishedAt: string
  startTime: string
}
