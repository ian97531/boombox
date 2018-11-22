import * as fs from 'fs'

import { ITranscript } from '@boombox/shared'
import {
  concatSegmentTranscriptions,
  copySpeakersFromTranscription,
  getStatements,
} from '../utils/transcript'

const desktop = '/Users/iwhite/Desktop/'
// const speakerFilename = `${desktop}/google-normalized-speaker-transcription-segment_0_7037.json`
// const wordFilename = `${desktop}/google-normalized-word-transcription-segment_0_7037.json`
const watson = concatSegmentTranscriptions([
  JSON.parse(
    fs.readFileSync(`${desktop}/108/watson/watson-transcription-segment_0_2346.json`, 'utf8')
  ) as ITranscript,
  JSON.parse(
    fs.readFileSync(`${desktop}/108/watson/watson-transcription-segment_2226_240.json`, 'utf8')
  ) as ITranscript,
  JSON.parse(
    fs.readFileSync(`${desktop}/108/watson/watson-transcription-segment_2346_2346.json`, 'utf8')
  ) as ITranscript,
  JSON.parse(
    fs.readFileSync(`${desktop}/108/watson/watson-transcription-segment_4572_240.json`, 'utf8')
  ) as ITranscript,
  JSON.parse(
    fs.readFileSync(`${desktop}/108/watson/watson-transcription-segment_4692_2345.json`, 'utf8')
  ) as ITranscript,
])

const google = JSON.parse(
  fs.readFileSync(
    `${desktop}/108/google/google-normalized-word-transcription-segment_0_7037.json`,
    'utf8'
  )
) as ITranscript

const combined = copySpeakersFromTranscription(watson, google)
const statements = getStatements(combined)

fs.writeFileSync('/Users/iwhite/Desktop/108/watson.json', JSON.stringify(watson, null, 2), 'utf-8')

fs.writeFileSync(
  '/Users/iwhite/Desktop/108/combined.json',
  JSON.stringify(combined, null, 2),
  'utf-8'
)

fs.writeFileSync(
  '/Users/iwhite/Desktop/108/statements.json',
  JSON.stringify(statements, null, 2),
  'utf-8'
)
