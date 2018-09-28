import { IEpisode, IJob } from '@boombox/shared/src/types/models'
import * as AWS from 'aws-sdk'
import { ENV, MAX_SEGMENT_LENGTH, MP3_PRESET, SEGMENT_OVERLAP_LENGTH } from '../../constants'
import { jobLambda } from '../../utils/lambda'
import { buildFilename } from '../../utils/s3'

const elasticTranscoder = new AWS.ElasticTranscoder()

const createJob = async (
  pipelineId: string,
  inputFilename: string,
  outputFilename: string,
  startTime: number,
  duration: number
) => {
  await elasticTranscoder
    .createJob({
      Input: {
        Key: inputFilename,
        TimeSpan: {
          Duration: duration.toString(),
          StartTime: startTime.toString(),
        },
      },
      Output: {
        Key: outputFilename,
        PresetId: MP3_PRESET,
      },
      PipelineId: pipelineId,
    })
    .promise()
  console.log(
    `Started a transcription job to split ${inputFilename} at a start time ` +
      `of ${startTime} seconds for a duration of ${duration} seconds.`
  )
}

const splitEpisodeAudioIntoSegments = async (
  episode: IEpisode,
  job: IJob,
  message: any,
  env: { [id: string]: any }
) => {
  if (!job.info.originalAudio) {
    throw Error(
      'The current job info object does not contain the filenames of the original' +
        `audio. ${JSON.stringify(job, null, 2)}`
    )
  }

  const pipelineId = env[ENV.SPLIT_PIPELINE_ID]
  const segments = Math.ceil(episode.duration / MAX_SEGMENT_LENGTH)
  const segmentDuration = Math.ceil(episode.duration / segments)
  const inputFilename = job.info.originalAudio.filename
  const splits = []

  let startTime = 0
  let index = 0
  let outputFilename

  while (index < segments - 1) {
    // Create a segment
    outputFilename = buildFilename(episode, job, { suffix: 'mp3', startTime })
    createJob(pipelineId, inputFilename, outputFilename, startTime, segmentDuration)
    splits.push(outputFilename)

    // Create a small segment that overlaps the previous and next segments.
    const overlapStartTime = startTime + segmentDuration - SEGMENT_OVERLAP_LENGTH / 2
    outputFilename = buildFilename(episode, job, { suffix: 'mp3', startTime: overlapStartTime })
    createJob(pipelineId, inputFilename, outputFilename, overlapStartTime, SEGMENT_OVERLAP_LENGTH)
    splits.push(outputFilename)

    startTime += segmentDuration
    index += 1
  }

  // Create the last segment to the end of the episode.
  const finalDuration = episode.duration - startTime
  outputFilename = buildFilename(episode, job, { suffix: 'mp3', startTime })
  createJob(pipelineId, inputFilename, outputFilename, startTime, finalDuration)
  splits.push(outputFilename)

  return {
    splitAudioFiles: splits,
  }
}

export const handler = jobLambda(splitEpisodeAudioIntoSegments)
