export enum JOB_STATUS {
  UNSTARTED = 'UNSTARTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

interface IJobBase {
  startTime: string | Date
  podcastSlug: string
  publishTimestamp: number
  status: JOB_STATUS
  lambdas: {
    [key: string]: {
      startTime: string
      endTime?: string
      status: JOB_STATUS
      error?: string
    }
  }
  info: {
    awsTranscribeJobs?: string[]
    originalAudio?: {
      bucket: string
      filename: string
    }
    splitAudioFiles?: string[]
    transcriptions?: string[]
    transcodedAudio?: {
      m4aFilename: string
      oggFilename: string
    }
  }
}
export interface IJob extends IJobBase {
  startTime: Date
}

export interface IJobDBRecord extends IJobBase {
  startTime: string
}
