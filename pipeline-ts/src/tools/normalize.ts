import { IAWSTranscriptionResult } from '@boombox/shared/src/types/aws'
import * as fs from 'fs'
import { SpeechRecognitionResults } from 'watson-developer-cloud/speech-to-text/v1-generated'
import { AWSTranscription } from '../utils/episode/awsTranscribe'
import { ISegment } from '../utils/episode/EpisodeJob'
import { WatsonTranscription } from '../utils/episode/watsonTranscribe'
import { appendAllTranscriptions, combineTranscriptions } from '../utils/normalized'

const segments = JSON.parse(
  '[{"audio":{"duration":2633,"filename":"./pipeline-ts/src/tools/json/audiosegment_0_2633.mp3","startTime":0},"transcription":{"aws":{"filename":"./pipeline-ts/src/tools/json/awsrawtranscriptionsegment_0_2633.json"},"watson":{"filename":"./pipeline-ts/src/tools/json/watsonrawtranscriptionsegment_0_2633.json","jobName":"371365f2-cdbe-11e8-890c-9f4e8ab94df6"}}},{"audio":{"duration":240,"filename":"./pipeline-ts/src/tools/json/audiosegment_2513_240.mp3","startTime":2513},"transcription":{"aws":{"filename":"./pipeline-ts/src/tools/json/awsrawtranscriptionsegment_2513_240.json"},"watson":{"filename":"./pipeline-ts/src/tools/json/watsonrawtranscriptionsegment_2513_240.json"}}},{"audio":{"duration":2632,"filename":"./pipeline-ts/src/tools/json/audiosegment_2633_2632.mp3","startTime":2633},"transcription":{"aws":{"filename":"./pipeline-ts/src/tools/json/awsrawtranscriptionsegment_2633_2632.json"},"watson":{"filename":"./pipeline-ts/src/tools/json/watsonrawtranscriptionsegment_2633_2632.json","jobName":"417fea74-cdbe-11e8-9522-2789d9c9143b"}}}]'
) as ISegment[]

const awsSegments = []
const watsonSegments = []

for (const segment of segments) {
  const awsContent = JSON.parse(
    fs.readFileSync(segment.transcription.aws.filename, 'utf8')
  ) as IAWSTranscriptionResult
  const awsTranscriptionSegment = new AWSTranscription(awsContent, segment.audio.startTime)
  awsSegments.push(awsTranscriptionSegment.getNormalizedTranscription())

  const watsonContent = JSON.parse(
    fs.readFileSync(segment.transcription.watson.filename, 'utf8')
  ) as SpeechRecognitionResults
  const watsonTranscriptionSegment = new WatsonTranscription(watsonContent, segment.audio.startTime)
  watsonSegments.push(watsonTranscriptionSegment.getNormalizedTranscription())
}

const awsTranscription = appendAllTranscriptions(awsSegments)
const watsonTranscription = appendAllTranscriptions(watsonSegments)

const finalTranscription = combineTranscriptions(awsTranscription, watsonTranscription)

fs.writeFileSync(
  '/Users/iwhite/Desktop/final.json',
  JSON.stringify(finalTranscription, null, 2),
  'utf-8'
)
