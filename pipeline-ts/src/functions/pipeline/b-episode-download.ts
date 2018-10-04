import { putEpisode } from '@boombox/shared/src/db/episodes'
import * as AWS from 'aws-sdk'
import Axios from 'axios'
import * as mp3Duration from 'mp3-duration'
import { ENV, FILE_DESIGNATIONS } from '../../constants'
import { IEpisodeDownloadMessage, IEpisodeSegmentStartMessage, IJobInput } from '../../types/jobs'
import { NextFunction } from '../../types/lambdas'
import { jobLambda } from '../../utils/job'
import { buildFilename } from '../../utils/s3'
import { logError, logStatus } from '../../utils/status'

const axios = Axios.create()
const s3 = new AWS.S3()

const findDuration = async (data: Buffer) => {
  return new Promise<number>((resolve, reject) => {
    mp3Duration(data, (error: Error, duration: number) => {
      if (error === undefined) {
        resolve(duration)
      } else {
        reject(error)
      }
    })
  })
}

const episodeDownload = async (
  input: IJobInput<IEpisodeDownloadMessage>,
  next: NextFunction<IEpisodeSegmentStartMessage>
) => {
  const bucket = process.env[ENV.BUCKET]
  if (bucket === undefined) {
    throw logError('The environment variable BUCKET is not defined.')
  }

  const filename = buildFilename(input.episode, FILE_DESIGNATIONS.ORIGINAL_AUDIO, { suffix: 'mp3' })
  logStatus(`Downloading ${input.episode.mp3URL} to ${bucket}/${filename}.`)

  const response = await axios({
    method: 'get',
    responseType: 'arraybuffer',
    url: input.episode.mp3URL,
  })
  const params = { Bucket: bucket, Key: filename, Body: response.data }
  await s3.upload(params).promise()
  const duration = await findDuration(response.data)
  input.episode.duration = duration
  putEpisode(input.episode)

  logStatus(
    `Completed downloading ${
      input.episode.mp3URL
    } to ${bucket}/${filename} with a length of ${duration} seconds.`
  )

  next({ bucket, filename })
}

export const handler = jobLambda(episodeDownload)
