import { putEpisode } from '@boombox/shared/src/db/episodes'
import { IJobRequest } from '@boombox/shared/src/types/models/job'
import * as AWS from 'aws-sdk'
import Axios from 'axios'
import * as mp3Duration from 'mp3-duration'
import { IEpisodeDownloadMessage, IEpisodeSegmentStartMessage } from '../../types/jobMessages'
import { ILambdaRequest } from '../../types/lambda'
import { buildFilename, FILE_DESIGNATIONS } from '../../utils/aws/s3'
import { getBucket } from '../../utils/environment'
import { jobHandler } from '../../utils/jobHandler'

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
  lambda: ILambdaRequest<IEpisodeDownloadMessage, IEpisodeSegmentStartMessage>,
  job: IJobRequest
) => {
  const bucket = getBucket()
  const filename = buildFilename(job.episode, FILE_DESIGNATIONS.ORIGINAL_AUDIO, { suffix: 'mp3' })
  await job.log(`Downloading ${job.episode.mp3URL} to ${bucket}/${filename}.`)

  const response = await axios({
    method: 'get',
    responseType: 'arraybuffer',
    url: job.episode.mp3URL,
  })
  const params = { Bucket: bucket, Key: filename, Body: response.data }
  await s3.upload(params).promise()
  await job.log(`Completed downloading ${job.episode.mp3URL} to ${bucket}/${filename}.`)
  await job.log('Finding episode duration...')
  const duration = await findDuration(response.data)
  job.episode.duration = duration
  await job.log(`Episode duration is ${duration} seconds.`)
  putEpisode(job.episode)

  lambda.nextFunction({ bucket, filename })
}

export const handler = jobHandler(episodeDownload)
