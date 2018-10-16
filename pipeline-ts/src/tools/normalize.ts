import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import * as fs from 'fs'
import { normalized } from '../utils/transcribe/normalized'

const timings = [
  {
    duration: 2783,
    startTime: 0,
  },
  {
    duration: 240,
    startTime: 2663,
  },
  {
    duration: 2782,
    startTime: 2783,
  },
]

const segments = [
  {
    audio: {
      duration: timings[0].duration,
      filename: `./pipeline-ts/src/tools/json/audio-segment_${timings[0].startTime}_${
        timings[0].duration
      }.mp3`,
      startTime: timings[0].startTime,
    },
    transcription: {
      aws: {
        filename: `./pipeline-ts/src/tools/json/aws-transcription-segment_${timings[0].startTime}_${
          timings[0].duration
        }.json`,
      },
      watson: {
        filename: `./pipeline-ts/src/tools/json/watson-transcription-segment_${
          timings[0].startTime
        }_${timings[0].duration}.json`,
        jobName: '371365f2-cdbe-11e8-890c-9f4e8ab94df6',
      },
    },
  },
  {
    audio: {
      duration: timings[1].duration,
      filename: `./pipeline-ts/src/tools/json/audio-segment_${timings[1].startTime}_${
        timings[1].duration
      }.mp3`,
      startTime: timings[1].startTime,
    },
    transcription: {
      aws: {
        filename: `./pipeline-ts/src/tools/json/aws-transcription-segment_${timings[1].startTime}_${
          timings[1].duration
        }.json`,
      },
      watson: {
        filename: `./pipeline-ts/src/tools/json/watson-transcription-segment_${
          timings[1].startTime
        }_${timings[1].duration}.json`,
      },
    },
  },
  {
    audio: {
      duration: timings[2].duration,
      filename: `./pipeline-ts/src/tools/json/audio-segment_${timings[2].startTime}_${
        timings[2].duration
      }.mp3`,
      startTime: timings[2].startTime,
    },
    transcription: {
      aws: {
        filename: `./pipeline-ts/src/tools/json/aws-transcription-segment_${timings[2].startTime}_${
          timings[2].duration
        }.json`,
      },
      watson: {
        filename: `./pipeline-ts/src/tools/json/watson-transcription-segment_${
          timings[2].startTime
        }_${timings[2].duration}.json`,
        jobName: '417fea74-cdbe-11e8-9522-2789d9c9143b',
      },
    },
  },
]

const awsSegments = []
const watsonSegments = []

for (const segment of segments) {
  const awsContent = JSON.parse(
    fs.readFileSync(segment.transcription.aws.filename, 'utf8')
  ) as ITranscript
  awsSegments.push(awsContent)

  const watsonContent = JSON.parse(
    fs.readFileSync(segment.transcription.watson.filename, 'utf8')
  ) as ITranscript
  watsonSegments.push(watsonContent)
}

const awsTranscription = normalized.appendAllTranscriptions(awsSegments)
const watsonTranscription = normalized.appendAllTranscriptions(watsonSegments)

const finalTranscription = normalized.combineTranscriptions(awsTranscription, watsonTranscription)

fs.writeFileSync(
  '/Users/iwhite/Desktop/final.json',
  JSON.stringify(finalTranscription, null, 2),
  'utf-8'
)
