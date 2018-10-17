import * as AWS from 'aws-sdk'
import * as Watson from 'watson-developer-cloud'
import {
  CheckJobParams,
  CreateJobParams,
  RecognitionJob,
} from 'watson-developer-cloud/speech-to-text/v1-generated'
import { IWatsonCredentials } from '../../types/watson'
import { getFileStream } from '../aws/s3'

export enum WATSON_TRANSCRIBE_STATUS {
  ERROR = 'failed',
  PROCESSING = 'processing',
  SUCCESS = 'completed',
  WAITING = 'waiting',
}

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
    transcribe.checkJob(params, (err: Error, data: any) => {
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

export const getTranscriptionJob = async (jobName: string): Promise<RecognitionJob> => {
  const credentials = await getWatsonCredentials()
  const params: CheckJobParams = {
    id: jobName,
  }
  return await checkJobAsync(params, credentials)
}
