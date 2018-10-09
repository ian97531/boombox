import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import * as AWS from 'aws-sdk'
import * as Watson from 'watson-developer-cloud'
import {
  CheckJobParams,
  CreateJobParams,
  RecognitionJob,
  SpeechRecognitionResults,
} from 'watson-developer-cloud/speech-to-text/v1-generated'
import { IWatsonCredentials } from '../../types/watson'
import { getFileStream, getJsonFile, putJsonFile } from '../aws/s3'
import { WatsonTranscription } from './Transcription'

const WATSON_TRANSCRIBE_SUCCESS_STATUS = 'completed'
const WATSON_TRANSCRIBE_ERROR_STATUS = 'failed'
const WATSON_TRANSCRIBE_WAITING_STATUS = 'waiting'
const WATSON_TRANSCRIBE_PROCESSING_STATUS = 'processing'

const WATSON_API_URL = 'https://stream.watsonplatform.net/speech-to-text/api/'

const secretManager = new AWS.SecretsManager()
let WATSON_CREDENTIALS: IWatsonCredentials

const getWatsonCredentials = async (): Promise<IWatsonCredentials> => {
  const CREDENTIAL_KEY = process.env.WATSON_TRANSCRIBE_CREDENTIALS as string
  if (CREDENTIAL_KEY === undefined) {
    throw Error('The WATSON_TRANSCRIBE_CREDENTIALS environment variable is undefined.')
  }
  if (WATSON_CREDENTIALS === undefined) {
    const response = await secretManager.getSecretValue({ SecretId: CREDENTIAL_KEY }).promise()
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
    const options = {
      ...credentials,
      url: WATSON_API_URL,
    }
    const transcribe = new Watson.SpeechToTextV1(options)
    transcribe.createJob(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

const checkJobAsync = (
  params: CheckJobParams,
  credentials: IWatsonCredentials
): Promise<RecognitionJob> => {
  return new Promise((resolve, reject) => {
    const options = {
      ...credentials,
      url: WATSON_API_URL,
    }
    const transcribe = new Watson.SpeechToTextV1(options)
    transcribe.checkJob(params, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

export const createTranscriptionJob = async (
  inputBucket: string,
  inputFilename: string
): Promise<string> => {
  const credentials = await getWatsonCredentials()
  const audio = await getFileStream(inputBucket, inputFilename)
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
  return response.id
}

export const checkTranscriptionJobExists = async (jobName: string): Promise<boolean> => {
  let exists = false

  try {
    const credentials = await getWatsonCredentials()
    const params: CheckJobParams = {
      id: jobName,
    }
    await checkJobAsync(params, credentials)
    exists = true
  } catch (error) {
    exists = false
  }

  return exists
}

export const checkTranscriptionJobComplete = async (jobName: string): Promise<boolean> => {
  let complete = false

  try {
    const credentials = await getWatsonCredentials()
    const params: CheckJobParams = {
      id: jobName,
    }
    const response = await checkJobAsync(params, credentials)
    complete = response.status === WATSON_TRANSCRIBE_SUCCESS_STATUS
  } catch (error) {
    complete = false
  }

  return complete
}

export const checkTranscriptionJobProcessing = async (jobName: string): Promise<boolean> => {
  let processing = false

  try {
    const credentials = await getWatsonCredentials()
    const params: CheckJobParams = {
      id: jobName,
    }
    const response = await checkJobAsync(params, credentials)
    const isWaiting = response.status === WATSON_TRANSCRIBE_WAITING_STATUS
    const isProcessing = response.status === WATSON_TRANSCRIBE_PROCESSING_STATUS
    processing = isWaiting || isProcessing
  } catch (error) {
    processing = false
  }

  return processing
}

export const getTranscription = async (bucket: string, filename: string): Promise<ITranscript> => {
  const rawTranscription = (await getJsonFile(bucket, filename)) as SpeechRecognitionResults
  const transcription = new WatsonTranscription(rawTranscription)
  return transcription.getNormalizedTranscription()
}

export const saveTranscriptionToS3 = async (
  jobName: string,
  outputBucket: string,
  outputFilename: string
) => {
  let transcription: SpeechRecognitionResults

  try {
    const credentials = await getWatsonCredentials()
    const params: CheckJobParams = {
      id: jobName,
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
    throw Error('Unable to find Watson transcription job: ' + jobName)
  }
  await putJsonFile(outputBucket, outputFilename, transcription)
}
