import { putEpisode } from '@boombox/shared/src/db/episodes'
import { getPodcast, putPodcast } from '@boombox/shared/src/db/podcasts'
import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IPodcast } from '@boombox/shared/src/types/models/podcast'
import * as Parser from 'rss-parser'
import slugify from 'slugify'
import { EPISODE_INSERT_LIMIT, FEED_URL, SLUGIFY_OPTIONS } from '../../constants'
import { NextFunction } from '../../types/lambdas'
import { startJobLambda } from '../../utils/job'
import { logStatus } from '../../utils/status'

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

const podcastCheckFeed = async (next: NextFunction<IEpisode>): Promise<void> => {
  // Retrieve the podcast feed.
  const parser = new Parser()
  const feed = await parser.parseURL(FEED_URL)

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
  logStatus(`Found ${items.length} episodes for podcast ${feed.title}`)

  let podcast: IPodcast
  try {
    podcast = await getPodcast(podcastSlug)
  } catch (error) {
    podcast = createPodcastFromFeed(podcastSlug, feed)
    await putPodcast(podcast)
  }

  let episodeIndex = 0
  const insertedEpisodes: IEpisode[] = []
  while (insertedEpisodes.length < EPISODE_INSERT_LIMIT && episodeIndex < items.length) {
    const episode: IEpisode = createEpisodeFromFeed(podcastSlug, items[episodeIndex])
    if (!(episode.slug in podcast.episodes)) {
      await putEpisode(episode)
      podcast.episodes[episode.slug] = episode.publishTimestamp
      next(episode)
      logStatus(`Started processing ${episode.podcastSlug} ${episode.slug}.`)
    }
    episodeIndex += 1
  }
}

export const handler = startJobLambda(podcastCheckFeed)
