import { IEpisode } from '@boombox/shared/src/types/models/episode'
import * as AWS from 'aws-sdk'
import { FILE_DESIGNATIONS, MP3_PRESET } from '../constants'
import { IEpisodeSegmentJob } from '../types/jobs'
import { buildFilename } from '../utils/s3'
import { logError, logStatus } from '../utils/status'

const elasticTranscoder = new AWS.ElasticTranscoder()

const getSegmentFilename = (episode: IEpisode, startTime: number, duration: number) => {
  const designation = FILE_DESIGNATIONS.AUDIO_SEGMENT
  const suffix = 'mp3'
  return buildFilename(episode, designation, { duration, startTime, suffix })
}

export const createSegmentJob = async (
  pipelineId: string,
  inputFilename: string,
  episode: IEpisode,
  startTime: number,
  duration: number
): Promise<IEpisodeSegmentJob> => {
  const outputFilename = getSegmentFilename(episode, startTime, duration)

  let jobId
  let jobArn

  if (!(await checkSegmentExists(episode, startTime, duration))) {
    const Input = {
      Key: inputFilename,
      TimeSpan: { Duration: duration.toString(), StartTime: startTime.toString() },
    }
    const Output = { Key: outputFilename, PresetId: MP3_PRESET }
    const params = { Input, Output, PipelineId: pipelineId }

    let response

    response = await elasticTranscoder.createJob(params).promise()

    if (response && response.Job && response.Job.Id && response.Job.Arn) {
      jobId = response.Job.Id
      jobArn = response.Job.Arn
      logStatus(
        `Started a transcription job to split ${inputFilename} at a start time ` +
          `of ${startTime} seconds for a duration of ${duration} seconds.`
      )
    } else {
      throw logError('No job created by ElasticTranscoder.createSegmentJob for params', {
        obj: params,
      })
    }
  }

  return { duration, filename: outputFilename, jobArn, jobId, startTime }
}

export const checkSegmentExists = async (
  episode: IEpisode,
  startTime: number,
  duration: number
): Promise<boolean> => {
  return true
}
