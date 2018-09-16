// import AWS = require('aws-sdk')
import { lambda } from 'utils/lambda'

const transcodeEpisodeAudio = async (event: any, env: { [id: string]: any }) => {
  console.log('success')
}

export const handler = lambda(transcodeEpisodeAudio)
