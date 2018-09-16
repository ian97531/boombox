import {
  getEpisodeForSlugs,
  getEpisodes,
  getPodcast,
  getSpeakers,
  getStatements,
} from '@boombox/shared/src/db'
import { IStatement, IStatementDBResult } from '@boombox/shared/src/types/models'
import { NextFunction, Response, Router } from 'express'
import { handleAsync, validatePageSize, validateQueryParams, validateStart } from 'middleware'
import { returnItem, returnList } from 'middleware/response'
import { IItemRequest, IListRequest } from 'types/requests'
import * as validator from 'validator'

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
  const query = {
    pageSize: req.query.pageSize as number,
    start: req.query.start as number,
  }
  const episodeResult = await getEpisodes(podcastSlug, query)

  req.items = episodeResult.items
  req.totalItems = Object.keys(podcast.episodes).length
  if (episodeResult.nextItem) {
    req.nextItem = episodeResult.nextItem
  }

  next()
}

const findStatements = async (req: IListRequest, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  const episodeSlug = validator.escape(req.params.episodeSlug)

  const episodeResult = await getEpisodeForSlugs(podcastSlug, episodeSlug)
  const speakerResult = await getSpeakers(episodeResult.speakers)

  const query = {
    pageSize: req.query.pageSize as number,
    start: req.query.start as number,
  }
  const statementResult = await getStatements(podcastSlug, episodeResult.publishTimestamp, query)

  const items: IStatement[] = statementResult.items.map((statement: IStatementDBResult) => {
    const newStatement: IStatement = {
      endTime: statement.endTime,
      speaker: speakerResult[statement.speaker],
      startTime: statement.startTime,
      words: statement.words,
    }
    return newStatement
  })

  req.items = items
  req.totalItems = episodeResult.totalStatements
  if (statementResult.nextItem) {
    req.nextItem = statementResult.nextItem
  }

  next()
}
