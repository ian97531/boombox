// import AWS = require('aws-sdk')
import { lambda } from 'utils/lambda'

const downloadPodcastEpisode = async (event: any, env: { [id: string]: any }) => {
  console.log('success')
}

export const handler = lambda(downloadPodcastEpisode)
