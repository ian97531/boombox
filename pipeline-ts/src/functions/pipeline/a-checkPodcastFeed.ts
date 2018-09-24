// import AWS = require('aws-sdk')
import { putEpisode } from '@boombox/shared/src/db/episodes'
import { getPodcast, putPodcast } from '@boombox/shared/src/db/podcasts'
import { IEpisode, IPodcast } from '@boombox/shared/src/types/models'
import * as Parser from 'rss-parser'
import slugify from 'slugify'
import { startJobLambda } from '../../utils/lambda'

const FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'
const INSERT_LIMIT = 'INSERT_LIMIT'
const SLUGIFY_OPTIONS = {
  lower: true,
  remove: /[*+~.()#$/^&\[\]|\\?<>,=_'"!:@]/g,
  replacement: '-',
}

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

function createEpisodeFromFeed(podcastSlug: string, item: any): IEpisode {
  const timeParts = item.itunes.duration.split(':')
  const hours = parseInt(timeParts[0], 10)
  const minutes = parseInt(timeParts[1], 10)
  const seconds = parseInt(timeParts[2], 10)

  const publishedAt = new Date()
  publishedAt.setTime(Date.parse(item.pubDate))

  return {
    duration: hours * 3600 + minutes * 60 + seconds,
    imageURL: item.itunes.image,
    mp3URL: item.enclosure.url,
    podcastSlug,
    publishTimestamp: publishedAt.getTime(),
    publishedAt,
    slug: slugify(item.title, SLUGIFY_OPTIONS),
    speakers: [],
    summary: item.content,
    title: item.title,
  }
}

const checkPodcastFeed = async (env: { [id: string]: any }): Promise<IEpisode[]> => {
  // Retrieve the podcast feed.
  const parser = new Parser()
  const feed = await parser.parseURL(FEED_URL)

  // Get all pages of the podcast's episodes
  let items = feed.items
  let page = 1
  let response
  do {
    page += 1
    const pageURL = FEED_URL + '&page=' + page
    response = await parser.parseURL(pageURL)
    items = [...items, ...response.items]
  } while (response && response.items && response.items.length > 0)

  // Get or create the podcast record in dynamodb.
  const podcastSlug = slugify(feed.title, SLUGIFY_OPTIONS)
  console.log(`Found ${items.length} episodes for podcast ${feed.title}`)

  let podcast: IPodcast
  try {
    podcast = await getPodcast(podcastSlug)
  } catch (error) {
    podcast = createPodcastFromFeed(podcastSlug, feed)
    await putPodcast(podcast)
  }

  let episodeIndex = 0
  const insertedEpisodes: IEpisode[] = []
  while (insertedEpisodes.length < env[INSERT_LIMIT] && episodeIndex < items.length) {
    const episode: IEpisode = createEpisodeFromFeed(podcastSlug, items[episodeIndex])

    if (!(episode.slug in podcast.episodes)) {
      await putEpisode(episode)
      podcast.episodes[episode.slug] = episode.publishTimestamp
      insertedEpisodes.push(episode)
    }

    episodeIndex += 1
  }

  console.log(`Started processing ${insertedEpisodes.length} episode(s).`)

  return insertedEpisodes
}

export const handler = startJobLambda(checkPodcastFeed)
