import * as AWS from 'aws-sdk'
import { retryThrottledRequests } from './throttle'

const transcribe = new AWS.TranscribeService()

export enum AWS_TRANSCRIBE_STATUS {
  ERROR = 'FAILED',
  PROCESSING = 'IN_PROGRESS',
  SUCCESS = 'COMPLETED',
  WAITING = 'IN_PROGRESS',
}

export const createTranscriptionJob = async (
  inputBucket: string,
  inputFilename: string,
  jobName: string,
  timeoutMilliseconds?: number
): Promise<void> => {
  const mediaUri = `https://s3-us-east-1.amazonaws.com/${inputBucket}/${inputFilename}`

  const params: AWS.TranscribeService.StartTranscriptionJobRequest = {
    LanguageCode: 'en-US',
    Media: {
      MediaFileUri: mediaUri,
    },
    MediaFormat: 'mp3',
    MediaSampleRateHertz: 44100,
    Settings: {
      MaxSpeakerLabels: 2,
      ShowSpeakerLabels: true,
    },
    TranscriptionJobName: jobName,
  }

  await retryThrottledRequests(async () => {
    return await transcribe.startTranscriptionJob(params).promise()
  }, timeoutMilliseconds)
}

export const getTranscriptionJob = async (
  jobName: string
): Promise<AWS.TranscribeService.TranscriptionJob> => {
  const params = {
    TranscriptionJobName: jobName,
  }
  const response = await retryThrottledRequests(async () => {
    return await transcribe.getTranscriptionJob(params).promise()
  })
  if (response.TranscriptionJob) {
    return response.TranscriptionJob
  } else {
    throw Error(`Transcription Job not found for jobName: ${jobName}`)
  }
}

export const deleteTranscriptionJob = async (jobName: string): Promise<void> => {
  const params = {
    TranscriptionJobName: jobName,
  }
  await retryThrottledRequests(async () => {
    return await transcribe.deleteTranscriptionJob(params).promise()
  })
}
