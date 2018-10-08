import { IEpisode } from '@boombox/shared/src/types/models/episode'
import * as AWS from 'aws-sdk'
import * as Watson from 'watson-developer-cloud'
import {
  CheckJobParams,
  CreateJobParams,
  RecognitionJob,
  SpeechRecognitionResults,
} from 'watson-developer-cloud/speech-to-text/v1-generated'
import { WATSON_TRANSCRIBE_ERROR_STATUS, WATSON_TRANSCRIBE_SUCCESS_STATUS } from '../../constants'
import { IEpisodeSegment, IEpisodeTranscriptionSegment } from '../../types/jobMessages'
import { IWatsonCredentials } from '../../types/watson'
import {
  buildFilename,
  checkFileExists,
  FILE_DESIGNATIONS,
  getFileStream,
  getJsonFile,
  putJsonFile,
} from '../aws/s3'
import { getBucket, getWatsonCredentialsKey } from '../environment'

const secretManager = new AWS.SecretsManager()
let WATSON_CREDENTIALS: IWatsonCredentials

const getWatsonCredentials = async (): Promise<IWatsonCredentials> => {
  if (WATSON_CREDENTIALS === undefined) {
    const SecretId = getWatsonCredentialsKey()
    const response = await secretManager.getSecretValue({ SecretId }).promise()
    if (response && response.SecretString) {
      WATSON_CREDENTIALS = JSON.parse(response.SecretString) as IWatsonCredentials
    } else {
      throw Error('Watson credentials not found in AWS Secret Manager.')
    }
  }

  return WATSON_CREDENTIALS
}

const createJobAsync = (
  params: CreateJobParams,
  credentials: IWatsonCredentials
): Promise<RecognitionJob> => {
  return new Promise((resolve, reject) => {
    const transcribe = new Watson.SpeechToTextV1(credentials)
    try {
      transcribe.createJob(params, resolve)
    } catch (error) {
      reject(error)
    }
  })
}

const checkJobAsync = (
  params: CheckJobParams,
  credentials: IWatsonCredentials
): Promise<RecognitionJob> => {
  return new Promise((resolve, reject) => {
    const transcribe = new Watson.SpeechToTextV1(credentials)
    try {
      transcribe.checkJob(params, resolve)
    } catch (error) {
      reject(error)
    }
  })
}

export const createTranscriptionJob = async (
  episode: IEpisode,
  segment: IEpisodeSegment
): Promise<IEpisodeTranscriptionSegment> => {
  const bucket = getBucket()
  const filename = buildFilename(episode, FILE_DESIGNATIONS.WATSON_RAW_TRANSCRIPTION_SEGMENT, {
    duration: segment.duration,
    startTime: segment.startTime,
    suffix: 'json',
  })
  const credentials = await getWatsonCredentials()
  const audio = await getFileStream(bucket, segment.filename)
  const params: CreateJobParams = {
    audio,
    content_type: 'audio/mp3',
    inactivity_timeout: -1,
    smart_formatting: true,
    speaker_labels: true,
    timestamps: true,
    word_confidence: true,
  }
  const response = await createJobAsync(params, credentials)

  return {
    ...segment,
    jobName: response.id,
    transcriptionFile: filename,
  }
}

export const checkTranscriptionJobExists = async (
  segment: IEpisodeTranscriptionSegment
): Promise<boolean> => {
  const bucket = getBucket()

  let exists = false
  if (await checkFileExists(bucket, segment.transcriptionFile)) {
    exists = true
  } else {
    try {
      const credentials = await getWatsonCredentials()
      const params: CheckJobParams = {
        id: segment.jobName,
      }
      await checkJobAsync(params, credentials)
      exists = true
    } catch (error) {
      exists = false
    }
  }

  return exists
}

export const checkTranscriptionJobComplete = async (
  segment: IEpisodeTranscriptionSegment
): Promise<boolean> => {
  const bucket = getBucket()

  let complete = false
  if (await checkFileExists(bucket, segment.transcriptionFile)) {
    complete = true
  } else {
    try {
      const credentials = await getWatsonCredentials()
      const params: CheckJobParams = {
        id: segment.jobName,
      }
      const response = await checkJobAsync(params, credentials)
      complete = response.status === WATSON_TRANSCRIBE_SUCCESS_STATUS
    } catch (error) {
      throw Error('Unable to find Watson transcription job: ' + segment.jobName)
    }
  }

  return complete
}

export const getTranscription = async (
  segment: IEpisodeTranscriptionSegment
): Promise<SpeechRecognitionResults> => {
  let transcription: SpeechRecognitionResults
  const bucket = getBucket()

  if (await checkFileExists(bucket, segment.transcriptionFile)) {
    transcription = getJsonFile(bucket, segment.transcriptionFile) as SpeechRecognitionResults
  } else {
    try {
      const credentials = await getWatsonCredentials()
      const params: CheckJobParams = {
        id: segment.jobName,
      }
      const response = await checkJobAsync(params, credentials)
      if (response.status === WATSON_TRANSCRIBE_SUCCESS_STATUS && response.results) {
        transcription = response.results[0]
      } else if (response.status === WATSON_TRANSCRIBE_ERROR_STATUS) {
        throw Error('The requested transcription job failed.')
      } else {
        throw Error('The requested transcription job is still processing.')
      }
    } catch (error) {
      throw Error('Unable to find Watson transcription job: ' + segment.jobName)
    }
  }

  return transcription
}

export const saveTranscriptionToS3 = async (segment: IEpisodeTranscriptionSegment) => {
  const bucket = getBucket()
  if (!(await checkFileExists(bucket, segment.transcriptionFile))) {
    const transcription = await getTranscription(segment)
    await putJsonFile(bucket, segment.transcriptionFile, transcription)
  }
}
