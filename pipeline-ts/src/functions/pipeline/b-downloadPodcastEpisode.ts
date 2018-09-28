import { putEpisode } from '@boombox/shared/src/db/episodes'
import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IJob } from '@boombox/shared/src/types/models/job'
import * as AWS from 'aws-sdk'
import Axios from 'axios'
import * as mp3Duration from 'mp3-duration'
import { ENV, S3_DESIGNATIONS } from '../../constants'
import { IDownloadPodcastEpisodeMessage } from '../../types/lambdas'
import { jobLambda, NextFunction } from '../../utils/lambda'
import { buildFilename } from '../../utils/s3'

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

const downloadPodcastEpisode = async (
  episode: IEpisode,
  job: IJob,
  message: undefined,
  env: NodeJS.ProcessEnv,
  next: NextFunction<IDownloadPodcastEpisodeMessage>
) => {
  const bucket = env[ENV.OUTPUT_BUCKET]
  if (bucket === undefined) {
    throw Error('The OUTPUT_BUCKET environement variable is not defined.')
  }
  const filename = buildFilename(episode, S3_DESIGNATIONS.ORIGINAL_AUDIO, { suffix: 'mp3' })
  console.log(`Downloading ${episode.mp3URL} to ${bucket}/${filename}.`)
  const response = await axios({ method: 'get', responseType: 'arraybuffer', url: episode.mp3URL })
  const params = { Bucket: bucket, Key: filename, Body: response.data }
  await s3.upload(params).promise()
  const duration = await findDuration(response.data)
  episode.duration = duration
  putEpisode(episode)
  console.log(
    `Completed downloading ${
      episode.mp3URL
    } to ${bucket}/${filename} with a length of ${duration} seconds.`
  )

  next({
    bucket,
    filename,
  })
}

export const handler = jobLambda(downloadPodcastEpisode)
