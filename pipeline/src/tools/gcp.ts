import Axios from 'axios'

// Imports the Google Cloud client library

// Creates a client

const gcsUri = 'gs://boombox-pipeline-test-audio/audio.flac'
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

const url =
  'https://speech.googleapis.com/v1p1beta1/speech:longrunningrecognize?key=AIzaSyBRrz1MBifITp0Tkk2SivJMPxAih6KpWXo'
// Detects speech in the audio file. This creates a recognition job that you
// can wait for now, or get its result later.
Axios.post(url, request)
  .then(response => {
    console.log(response)
  })
  .catch((error: Error) => {
    console.log('ERROR')
    console.log(error)
  })
