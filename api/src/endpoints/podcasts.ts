import { NextFunction, Response, Router } from 'express'
import * as validator from 'validator'

import { db, IEpisode, IPodcast, IStatement } from '@boombox/shared'
import {
  handleAsync,
  returnItem,
  returnList,
  validatePageSize,
  validateQueryParams,
  validateStart,
} from '../middleware'
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

const findPodcast = async (req: IItemRequest<IPodcast>, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  req.item = await db.podcasts.getPodcast(podcastSlug)

  next()
}

const findEpisode = async (req: IItemRequest<IEpisode>, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  const episodeSlug = validator.escape(req.params.episodeSlug)

  req.item = await db.episodes.getEpisodeForSlugs(podcastSlug, episodeSlug)

  next()
}

const findEpisodes = async (req: IListRequest<IEpisode>, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  const podcast = await db.podcasts.getPodcast(podcastSlug)

  const pageSize = req.query.pageSize
  const startTime = new Date(req.query.start)

  const episodes = await db.episodes.getEpisodes(podcastSlug, startTime, pageSize + 1)

  if (episodes.length === pageSize + 1) {
    req.nextItem = episodes[pageSize].publishedAt.toISOString()
    req.items = episodes.slice(0, pageSize)
  } else {
    req.items = episodes
  }
  req.totalItems = Object.keys(podcast.episodes).length

  next()
}

const findStatements = async (req: IListRequest<IStatement>, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  const episodeSlug = validator.escape(req.params.episodeSlug)

  const episode = await db.episodes.getEpisodeForSlugs(podcastSlug, episodeSlug)

  const pageSize = req.query.pageSize
  const startTime = req.query.start

  const statements = await db.statements.getStatements(
    podcastSlug,
    episode.publishedAt,
    startTime,
    pageSize + 1
  )

  if (statements.length === pageSize + 1) {
    req.nextItem = statements[pageSize].endTime
    req.items = statements.slice(0, pageSize)
  } else {
    req.items = statements
  }

  req.totalItems = episode.totalStatements || 0

  next()
}
