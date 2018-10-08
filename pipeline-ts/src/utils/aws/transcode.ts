import { IEpisode } from '@boombox/shared/src/types/models/episode'
import * as AWS from 'aws-sdk'
import { IEpisodeSegment } from '../../types/jobMessages'
import { getBucket } from '../../utils/environment'
import { logStatus } from '../status'
import { buildFilename, checkFileExists, FILE_DESIGNATIONS } from './s3'

const elasticTranscoder = new AWS.ElasticTranscoder()

export const M4A_PRESET = '1351620000001-100120' // M4A AAC 160 44k
export const MP3_PRESET = '1351620000001-300030' // MP3 160 44k
export const OGG_PRESET = '1531717800275-2wz911' // OGG Vorbis 160 44k

const getSegmentFilename = (episode: IEpisode, startTime: number, duration: number) => {
  const designation = FILE_DESIGNATIONS.AUDIO_SEGMENT
  const suffix = 'mp3'
  return buildFilename(episode, designation, { duration, startTime, suffix })
}

export const checkSegmentFileExists = async (segmentJob: IEpisodeSegment): Promise<boolean> => {
  const bucket = getBucket()
  return await checkFileExists(bucket, segmentJob.filename)
}

export const createSegmentJob = async (
  pipelineId: string,
  inputFilename: string,
  episode: IEpisode,
  startTime: number,
  duration: number
): Promise<IEpisodeSegment> => {
  const filename = getSegmentFilename(episode, startTime, duration)

  if (!(await checkSegmentFileExists({ duration, filename, startTime }))) {
    const Input = {
      Key: inputFilename,
      TimeSpan: { Duration: duration.toString(), StartTime: startTime.toString() },
    }
    const Output = { Key: filename, PresetId: MP3_PRESET }
    const params = { Input, Output, PipelineId: pipelineId }

    let response

    response = await elasticTranscoder.createJob(params).promise()

    if (response.Job && response.Job.Id) {
      logStatus(
        `Started a transcription job to split ${inputFilename} at a start time ` +
          `of ${startTime} seconds for a duration of ${duration} seconds.`
      )
    } else {
      throw Error(
        'No job created by ElasticTranscoder.createSegmentJob for params' +
          JSON.stringify(params, null, 2)
      )
    }
  }
  return { duration, filename, startTime }
}
