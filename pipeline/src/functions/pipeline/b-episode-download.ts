import * as AWS from 'aws-sdk'
import Axios from 'axios'
import * as mp3Duration from 'mp3-duration'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { episodeSegment } from './c-episode-segment'
import { episodeTranscribe } from './d-episode-transcribe'

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

const episodeDownloadHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  await job.log(`Downloading ${episode.mp3URL}.`)

  const response = await axios({
    method: 'get',
    responseType: 'arraybuffer',
    url: episode.mp3URL,
  })

  await job.log('Finding episode duration...')
  const episodeDuration = await findDuration(response.data)
  await job.log(`Episode duration is ${episodeDuration} seconds.`)

  episode.duration = episodeDuration
  episode.createSegments()

  if (episode.audio) {
    const params = { Bucket: episode.bucket, Key: episode.audio.filename, Body: response.data }
    await s3.upload(params).promise()
    await job.log(
      `Completed writing ${episode.mp3URL} to ${episode.bucket}/${episode.audio.filename}.`
    )

    if (episode.segments.length === 1) {
      job.log('Skipping transcoding because the entire audio fits into a single segment.')
      episode.segments[0].audio.filename = episode.audio.filename
      episodeTranscribe(lambda, job, episode)
    } else {
      episodeSegment(lambda, job, episode)
    }
  } else {
    throw Error(
      'episode.audio was not properly configured by episode.createSegments.' +
        JSON.stringify(episode, null, 2)
    )
  }
}

export const episodeDownload = episodeCaller(ENV.EPISODE_DOWNLOAD_QUEUE)
export const handler = episodeHandler(episodeDownloadHandler)
