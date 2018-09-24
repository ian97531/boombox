import { IEpisode, IJob } from '@boombox/shared/src/types/models'
import * as AWS from 'aws-sdk'
import Axios from 'axios'
import { jobLambda } from '../../utils/lambda'
import { buildFilename } from '../../utils/s3'

const S3 = new AWS.S3()
const OUTPUT_BUCKET = 'OUTPUT_BUCKET'

const downloadPodcastEpisode = async (episode: IEpisode, job: IJob, env: { [id: string]: any }) => {
  const bucket = env[OUTPUT_BUCKET]
  const filename = buildFilename('mp3', episode.podcastSlug, episode.slug, episode.publishTimestamp)
  const axios = Axios.create()
  const response = await axios({ method: 'get', responseType: 'stream', url: episode.mp3URL })
  const params = { Bucket: bucket, Key: filename, Body: response.data }
  console.log(`Downloading ${episode.mp3URL} to ${bucket}/${filename}.`)
  await S3.upload(params).promise()
  console.log(`Completed downloading ${episode.mp3URL} to ${bucket}/${filename}.`)
}

export const handler = jobLambda(downloadPodcastEpisode)
