import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import * as AWS from 'aws-sdk'
import Axios from 'axios'
import { IAWSTranscription, IAWSTranscriptionResult } from '../../types/aws'
import { getJsonFile, putJsonFile } from './s3'
import { AWSTranscription } from './Transcription'

const transcribe = new AWS.TranscribeService()
const axios = Axios.create()

export const AWS_TRANSCRIBE_SUCCESS_STATUS = 'COMPLETED'
export const AWS_TRANSCRIBE_ERROR_STATUS = 'FAILED'
export const AWS_TRANSCRIBE_PROCESSING_STATUS = 'IN_PROGRESS'

export interface IAWSCreateJob {
  jobName: string
  jobStarted: boolean
}

const getJobName = (inputFilename: string): string => {
  return inputFilename.replace(/[\/\.]/gi, '__')
}

export const createTranscriptionJob = async (
  region: string,
  inputBucket: string,
  inputFilename: string
): Promise<IAWSCreateJob> => {
  const jobName = getJobName(inputFilename)
  let jobStarted = false
  const mediaUri = `https://s3-${region}.amazonaws.com/${inputBucket}/${inputFilename}`
  if (!(await checkTranscriptionJobExists(jobName))) {
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
    await transcribe.startTranscriptionJob(params).promise()
    jobStarted = true
  }
  return {
    jobName,
    jobStarted,
  }
}

export const checkTranscriptionJobExists = async (jobName: string): Promise<boolean> => {
  let exists = false
  try {
    const params = {
      TranscriptionJobName: jobName,
    }
    await transcribe.getTranscriptionJob(params).promise()
    exists = true
  } catch (error) {
    exists = false
  }

  return exists
}

export const checkTranscriptionJobComplete = async (jobName: string): Promise<boolean> => {
  let complete = false
  const params = {
    TranscriptionJobName: jobName,
  }
  const response = await transcribe.getTranscriptionJob(params).promise()
  if (response.TranscriptionJob && response.TranscriptionJob.TranscriptionJobStatus) {
    const status = response.TranscriptionJob.TranscriptionJobStatus
    complete = status === AWS_TRANSCRIBE_SUCCESS_STATUS
  } else {
    complete = false
  }

  return complete
}

export const checkTranscriptionJobProcessing = async (jobName: string): Promise<boolean> => {
  let processing = false
  const params = {
    TranscriptionJobName: jobName,
  }
  const response = await transcribe.getTranscriptionJob(params).promise()
  if (response.TranscriptionJob && response.TranscriptionJob.TranscriptionJobStatus) {
    const status = response.TranscriptionJob.TranscriptionJobStatus
    processing = status === AWS_TRANSCRIBE_PROCESSING_STATUS
  } else {
    processing = false
  }

  return processing
}

export const getTranscription = async (bucket: string, filename: string): Promise<ITranscript> => {
  console.log(`Fetching ${filename}...`)
  const rawAWSTranscription = (await getJsonFile(bucket, filename)) as IAWSTranscriptionResult
  const transcription = new AWSTranscription(rawAWSTranscription)
  return transcription.getNormalizedTranscription()
}

export const saveTranscriptionToS3 = async (
  jobName: string,
  outputBucket: string,
  outputFilename: string
) => {
  let transcription
  const params = {
    TranscriptionJobName: jobName,
  }
  const response = await transcribe.getTranscriptionJob(params).promise()

  if (response.TranscriptionJob && response.TranscriptionJob.TranscriptionJobStatus) {
    const status = response.TranscriptionJob.TranscriptionJobStatus
    const complete = status === AWS_TRANSCRIBE_SUCCESS_STATUS
    if (complete) {
      if (
        response.TranscriptionJob.Transcript &&
        response.TranscriptionJob.Transcript.TranscriptFileUri
      ) {
        const url = response.TranscriptionJob.Transcript.TranscriptFileUri
        const transcriptResponse = await axios({
          method: 'get',
          responseType: 'json',
          url,
        })

        transcription = (transcriptResponse.data as IAWSTranscription).results
      } else {
        throw Error(`Could not find the transcription for a complete job: ${jobName}`)
      }
    } else {
      throw Error(`Could not get the transcription for an incomplete job: ${jobName}`)
    }
  } else {
    throw Error('No transcription job returned by getTranscriptionJob.')
  }

  await putJsonFile(outputBucket, outputFilename, transcription)
}
