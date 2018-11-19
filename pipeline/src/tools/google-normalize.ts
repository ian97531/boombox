import * as fs from 'fs'

import { ITranscript } from '@boombox/shared'
import { normalized } from '../utils/transcribe'

const location = '/Users/iwhite/Desktop/106-gcp.json'

const transcript = JSON.parse(fs.readFileSync(location, 'utf8')) as ITranscript
const sentences = normalized.getSentences(transcript)

for (const sentence of sentences) {
  const words = sentence.words.reduce((soFar, word) => {
    return `${soFar} ${word.content}`
  }, '')
  console.log(`Speaker ${sentence.speaker}: ${words}\n`)
}

fs.writeFileSync(
  '/Users/iwhite/Desktop/sentences.json',
  JSON.stringify(sentences, null, 2),
  'utf-8'
)
