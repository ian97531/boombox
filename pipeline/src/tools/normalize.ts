import * as fs from 'fs'

import { ITranscript } from '@boombox/shared'
import { getStatements } from '../utils/normalized'

const location = '/Users/iwhite/Desktop/final-transcription.json'

const transcript = JSON.parse(fs.readFileSync(location, 'utf8')) as ITranscript

const statements = getStatements(transcript)

fs.writeFileSync(
  '/Users/iwhite/Desktop/statements.json',
  JSON.stringify(statements, null, 2),
  'utf-8'
)
