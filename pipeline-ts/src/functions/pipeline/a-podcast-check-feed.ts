import { getPodcast, putPodcast } from '@boombox/shared/src/db/podcasts'
import { IPodcast } from '@boombox/shared/src/types/models/podcast'
import * as Parser from 'rss-parser'
import slugify from 'slugify'
import { SLUGIFY_OPTIONS } from '../../constants'
import { ENV, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda, lambdaCaller, lambdaHandler } from '../../utils/lambda'
import { episodeDownload } from './b-episode-download'

const FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'
const EPISODE_JOB_LIMIT = 1

function createPodcastFromFeed(podcastSlug: string, feed: any): IPodcast {
  const currentTime = new Date()
  const publishDate = new Date()
  publishDate.setTime(Date.parse(feed.lastBuildDate))
  return {
    author: feed.itunes.author,
    createdAt: currentTime,
    episodes: {},
    feedURL: FEED_URL,
    imageURL: feed.itunes.image,
    language: feed.language,
    lastCheckedAt: currentTime,
    lastPublishedAt: publishDate,
    podcastURL: feed.link,
    slug: podcastSlug,
    subtitle: feed.itunes.subtitle,
    summary: feed.itunes.summary,
    title: feed.title,
  }
}

const podcastCheckFeedHandler = async (lambda: Lambda): Promise<void> => {
  // Retrieve the podcast feed.
  const parser = new Parser()
  const feed = await parser.parseURL(FEED_URL)
  const buckets = {
    episode: Lambda.getEnvVariable(ENV.BUCKET) as string,
    segments: Lambda.getEnvVariable(ENV.SEGMENTS_BUCKET) as string,
    transcriptions: Lambda.getEnvVariable(ENV.TRANSCRIPTIONS_BUCKET) as string,
  }

  // Get all pages of the podcast's episodes
  let items = feed.items
  let page = 1
  let response
  do {
    page += 1
    const pageURL = `${FEED_URL}&page=${page}`
    response = await parser.parseURL(pageURL)
    items = [...items, ...response.items]
  } while (response && response.items && response.items.length > 0)

  // Get or create the podcast record in dynamodb.
  const podcastSlug = slugify(feed.title, SLUGIFY_OPTIONS)
  lambda.log(`Found ${items.length} episodes for podcast ${feed.title}`)

  let podcast: IPodcast
  try {
    podcast = await getPodcast(podcastSlug)
  } catch (error) {
    podcast = createPodcastFromFeed(podcastSlug, feed)
    await putPodcast(podcast)
  }

  let episodeIndex = 0
  let episodeJobs = 0
  while (episodeJobs < EPISODE_JOB_LIMIT && episodeIndex < items.length) {
    const episode = await EpisodeJob.createFromFeed(buckets, podcast, items[episodeIndex])
    if (episode) {
      const logName = `${episode.podcastSlug} ${episode.slug}`
      const job = await Job.create(lambda, logName)
      episodeDownload(lambda, job, episode)
      episodeJobs += 1
    }
    episodeIndex += 1
  }
}

export const podcastCheckFeed = lambdaCaller(ENV.PODCAST_CHECK_FEED_QUEUE)
export const handler = lambdaHandler(podcastCheckFeedHandler)
