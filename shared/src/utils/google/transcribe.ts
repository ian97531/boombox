import Axios from 'axios'
import {
  GoogleSpeechAudioEncoding,
  GoogleSpeechInteractionType,
  GoogleSpeechJobId,
  GoogleSpeechMicrophoneDistance,
  GoogleSpeechModel,
  GoogleSpeechOriginalMediaType,
  GoogleSpeechRecordingDeviceType,
  IGoogleApiKey,
  IGoogleSpeechMetadata,
  IGoogleSpeechRecognitionConfig,
  IGoogleSpeechResponse,
} from '../../types/google'
import { getSecret } from '../aws/secrets'

const GOOGLE_SPEECH_URL = 'https://speech.googleapis.com/v1p1beta1'

export enum GOOGLE_TRANSCRIBE_STATUS {
  ERROR = 'failed',
  PROCESSING = 'processing',
  SUCCESS = 'completed',
  WAITING = 'waiting',
}

let GOOGLE_API_KEY: IGoogleApiKey

const getGoogleApiKey = async (): Promise<IGoogleApiKey> => {
  if (GOOGLE_API_KEY === undefined) {
    const CREDENTIAL_KEY = process.env.GOOGLE_API_KEY as string
    if (CREDENTIAL_KEY === undefined) {
      throw Error('The WATSON_TRANSCRIBE_CREDENTIALS environment variable is undefined.')
    }
    GOOGLE_API_KEY = (await getSecret(CREDENTIAL_KEY)) as IGoogleApiKey
  }
  return GOOGLE_API_KEY
}

const createJobAsync = async (
  audioUri: string,
  config: IGoogleSpeechRecognitionConfig,
  credentials: IGoogleApiKey
): Promise<GoogleSpeechJobId> => {
  const longRunningRecognize = 'speech:longrunningrecognize'
  const url = `${GOOGLE_SPEECH_URL}/${longRunningRecognize}?key=${credentials.key}`
  const request = {
    audio: {
      uri: audioUri,
    },
    config,
  }

  const response = await Axios.post(url, request)
  return response.data.name
}

export const createTranscriptionJob = async (
  bucket: string,
  filename: string,
  speakers: number
): Promise<GoogleSpeechJobId> => {
  const credentials = await getGoogleApiKey()
  const uri = `gs://${bucket}/${filename}`

  const encoding = GoogleSpeechAudioEncoding.FLAC
  const sampleRateHertz = 44100
  const languageCode = 'en-US'

  const recognitionMetadata: IGoogleSpeechMetadata = {
    interactionType: GoogleSpeechInteractionType.DISCUSSION,
    microphoneDistance: GoogleSpeechMicrophoneDistance.NEARFIELD,
    originalMediaType: GoogleSpeechOriginalMediaType.AUDIO,
    originalMimeType: 'audio/mp3',
    recordingDeviceType: GoogleSpeechRecordingDeviceType.OTHER_INDOOR_DEVICE,
  }

  const config: IGoogleSpeechRecognitionConfig = {
    diarizationSpeakerCount: speakers,
    enableAutomaticPunctuation: true,
    enableSpeakerDiarization: speakers > 1,
    enableWordTimeOffsets: true,
    encoding,
    languageCode,
    metadata: recognitionMetadata,
    model: GoogleSpeechModel.PHONE_CALL,
    sampleRateHertz,
    useEnhanced: true,
  }

  return await createJobAsync(uri, config, credentials)
}

export const getTranscriptionJob = async (
  jobId: GoogleSpeechJobId
): Promise<IGoogleSpeechResponse> => {
  const credentials = await getGoogleApiKey()
  const getJob = `operations/${jobId}`
  const url = `${GOOGLE_SPEECH_URL}/${getJob}?key=${credentials.key}`
  const response = await Axios.get(url)
  return response.data as IGoogleSpeechResponse
}
