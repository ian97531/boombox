import * as AWS from 'aws-sdk'
import { retryThrottledRequests } from './throttle'

const transcribe = AWS.TranscribeService ? new AWS.TranscribeService() : undefined

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

  if (transcribe) {
    await retryThrottledRequests(async () => {
      return await transcribe.startTranscriptionJob(params).promise()
    }, timeoutMilliseconds)
  } else {
    throw new Error('The transcribe service cannot be used in browsers.')
  }
}

export const getTranscriptionJob = async (
  jobName: string
): Promise<AWS.TranscribeService.TranscriptionJob> => {
  const params = {
    TranscriptionJobName: jobName,
  }
  if (transcribe) {
    const response = await retryThrottledRequests(async () => {
      return await transcribe.getTranscriptionJob(params).promise()
    })
    if (response.TranscriptionJob) {
      return response.TranscriptionJob
    } else {
      throw Error(`Transcription Job not found for jobName: ${jobName}`)
    }
  } else {
    throw new Error('The transcribe service cannot be used in browsers.')
  }
}

export const deleteTranscriptionJob = async (jobName: string): Promise<void> => {
  const params = {
    TranscriptionJobName: jobName,
  }
  if (transcribe) {
    await retryThrottledRequests(async () => {
      return await transcribe.deleteTranscriptionJob(params).promise()
    })
  } else {
    throw new Error('The transcribe service cannot be used in browsers.')
  }
}
