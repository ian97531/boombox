import { getEpisodeForSlugs, getEpisodes, getPodcast, getStatements } from '@boombox/shared/src/db'
import { NextFunction, Response, Router } from 'express'
import * as validator from 'validator'
import { handleAsync, validatePageSize, validateQueryParams, validateStart } from '../middleware'
import { returnItem, returnList } from '../middleware/response'
import { IItemRequest, IListRequest } from '../types/requests'

export default function() {
  const router = Router()

  router.get(
    '/:podcastSlug/episodes/:episodeSlug/statements',
    validateQueryParams(['pageSize', 'start']),
    validateStart(),
    validatePageSize(),
    handleAsync(findStatements),
    returnList
  )

  router.get('/:podcastSlug/episodes/:episodeSlug', handleAsync(findEpisode), returnItem)

  router.get(
    '/:podcastSlug/episodes',
    validateQueryParams(['pageSize', 'start']),
    validateStart(),
    validatePageSize(),
    handleAsync(findEpisodes),
    returnList
  )

  router.get('/:podcastSlug', handleAsync(findPodcast), returnItem)

  return router
}

const findPodcast = async (req: IItemRequest, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  req.item = await getPodcast(podcastSlug)

  next()
}

const findEpisode = async (req: IItemRequest, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  const episodeSlug = validator.escape(req.params.episodeSlug)

  req.item = await getEpisodeForSlugs(podcastSlug, episodeSlug)

  next()
}

const findEpisodes = async (req: IListRequest, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  const podcast = await getPodcast(podcastSlug)

  const pageSize = req.query.pageSize
  const startTime = req.query.start

  const episodes = await getEpisodes(podcastSlug, startTime, pageSize + 1)

  if (episodes.length === pageSize + 1) {
    req.nextItem = episodes[pageSize].publishTimestamp
    req.items = episodes.slice(0, pageSize)
  } else {
    req.items = episodes
  }
  req.totalItems = Object.keys(podcast.episodes).length

  next()
}

const findStatements = async (req: IListRequest, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  const episodeSlug = validator.escape(req.params.episodeSlug)

  const episode = await getEpisodeForSlugs(podcastSlug, episodeSlug)

  const pageSize = req.query.pageSize
  const startTime = req.query.start

  const statements = await getStatements(
    podcastSlug,
    episode.publishTimestamp,
    startTime,
    pageSize + 1
  )

  if (statements.length === pageSize + 1) {
    req.nextItem = statements[pageSize].endTime
    req.items = statements.slice(0, pageSize)
  }

  req.totalItems = episode.totalStatements || 0

  next()
}
