// import AWS = require('aws-sdk')
import * as Parser from 'rss-parser'
import { asyncLambda } from '../../utils/lambda'

// const SNS = new AWS.SNS({ apiVersion: '2010-03-31' })
const FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'

const checkPodcastFeed = async (event: any, env: { [id: string]: any }) => {
  const parser = new Parser()
  const feed = await parser.parseURL(FEED_URL)
  console.log(JSON.stringify(feed))
}

export const handler = asyncLambda(checkPodcastFeed)
