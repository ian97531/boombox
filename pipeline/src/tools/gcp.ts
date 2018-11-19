import { v1p1beta1 as speech } from '@google-cloud/speech'
import * as fs from 'fs'
import { GoogleTranscription } from '../utils/transcribe/google/GoogleTranscription'

// Imports the Google Cloud client library

// Creates a client
const client = new speech.SpeechClient()

const gcsUri = 'gs://boombox-pipeline-test-audio/106.flac'
const encoding = 'FLAC'
const sampleRateHertz = 44100
const languageCode = 'en-US'

const recognitionMetadata = {
  interactionType: 'DISCUSSION',
  microphoneDistance: 'NEARFIELD',
  originalMediaType: 'AUDIO',
  originalMimeType: 'audio/mp3',
  recordingDeviceType: 'OTHER_INDOOR_DEVICE',
}

const config = {
  // diarizationSpeakerCount: 2,
  enableAutomaticPunctuation: true,
  // enableSpeakerDiarization: true,
  enableWordTimeOffsets: true,
  encoding,
  languageCode,
  metadata: recognitionMetadata,
  model: 'phone_call',
  sampleRateHertz,
  useEnhanced: true,
}

const audio = {
  uri: gcsUri,
}

const request = {
  audio,
  config,
}

// Detects speech in the audio file. This creates a recognition job that you
// can wait for now, or get its result later.
client
  .longRunningRecognize(request)
  .then((data: any) => {
    const operation = data[0]
    // Get a Promise representation of the final result of the job
    return operation.promise()
  })
  .then((data: any) => {
    console.log('received data')

    const transcription = new GoogleTranscription(data[0])
    const normalized = transcription.getNormalizedTranscription()
    fs.writeFileSync('/Users/iwhite/Desktop/gcp.json', JSON.stringify(normalized, null, 2), 'utf-8')
    console.log('done')
  })
  .catch((err: Error) => {
    console.error('ERROR:', err)
  })
