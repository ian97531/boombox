import * as fs from 'fs'

import { ITranscript } from '@boombox/shared'
import { normalized } from '../utils/transcribe'

const location = '/Users/iwhite/Desktop'
const awsDir = `${location}/aws`
const watsonDir = `${location}/watson`

const awsSegments = fs.readdirSync(awsDir).map(file => {
  return JSON.parse(fs.readFileSync(`${awsDir}/${file}`, 'utf8')) as ITranscript
})
const watsonSegments = fs.readdirSync(watsonDir).map(file => {
  return JSON.parse(fs.readFileSync(`${watsonDir}/${file}`, 'utf8')) as ITranscript
})

const awsTranscription = normalized.appendAllTranscriptions(awsSegments)
const watsonTranscription = normalized.appendAllTranscriptions(watsonSegments)

const finalTranscription = normalized.combineTranscriptions(awsTranscription, watsonTranscription)

fs.writeFileSync(
  '/Users/iwhite/Desktop/final.json',
  JSON.stringify(finalTranscription, null, 2),
  'utf-8'
)
