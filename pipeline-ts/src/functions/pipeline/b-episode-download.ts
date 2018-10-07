import { putEpisode } from '@boombox/shared/src/db/episodes'
import * as AWS from 'aws-sdk'
import Axios from 'axios'
import * as mp3Duration from 'mp3-duration'
import { FILE_DESIGNATIONS } from '../../constants'
import { IEpisodeDownloadMessage, IEpisodeSegmentStartMessage, IJobInput } from '../../types/jobs'
import { NextFunction } from '../../types/lambdas'
import { buildFilename } from '../../utils/aws/s3'
import { getBucket } from '../../utils/environment'
import { jobLambda } from '../../utils/job'
import { logStatus } from '../../utils/status'

const axios = Axios.create()
const s3 = new AWS.S3()

const findDuration = async (data: Buffer) => {
  return new Promise<number>((resolve, reject) => {
    mp3Duration(data, (error: Error, duration: number) => {
      if (error) {
        reject(error)
      } else {
        resolve(duration)
      }
    })
  })
}

const episodeDownload = async (
  input: IJobInput<IEpisodeDownloadMessage>,
  next: NextFunction<IEpisodeSegmentStartMessage>
) => {
  const bucket = getBucket()
  const filename = buildFilename(input.episode, FILE_DESIGNATIONS.ORIGINAL_AUDIO, { suffix: 'mp3' })
  logStatus(`Downloading ${input.episode.mp3URL} to ${bucket}/${filename}.`)

  const response = await axios({
    method: 'get',
    responseType: 'arraybuffer',
    url: input.episode.mp3URL,
  })
  const params = { Bucket: bucket, Key: filename, Body: response.data }
  await s3.upload(params).promise()
  logStatus(`Completed downloading ${input.episode.mp3URL} to ${bucket}/${filename}.`)
  logStatus('Finding episode duration...')
  const duration = await findDuration(response.data)
  input.episode.duration = duration
  logStatus(`Episode duration is ${duration} seconds.`)
  putEpisode(input.episode)

  next({ bucket, filename })
}

export const handler = jobLambda(episodeDownload)
