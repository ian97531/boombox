import { IStatement } from '@boombox/shared/types/models'
import { NextFunction, Response, Router } from 'express'
import validator = require('validator')
import { getEpisodeForSlugs, getSpeakers, getStatements } from '../db'
import {
  handleAsync,
  validatePageSize,
  validateQueryParams,
  validateStartTime,
} from '../middleware'
import { returnStatements } from '../responses/returnList'
import { IStatementListRequest } from '../types/requests'

export default function() {
  const router = Router()

  router.get(
    '/:podcastSlug/episodes/:episodeSlug/statements',
    validateQueryParams(['pageSize', 'startTime']),
    validateStartTime(),
    validatePageSize(),
    handleAsync(findStatements),
    returnStatements
  )

  return router
}

const findStatements = async (req: IStatementListRequest, res: Response, next: NextFunction) => {
  const podcastSlug = validator.escape(req.params.podcastSlug)
  const episodeSlug = validator.escape(req.params.episodeSlug)

  const episodeResult = await getEpisodeForSlugs(podcastSlug, episodeSlug)
  const speakerResult = await getSpeakers(episodeResult.speakers)
  const query = {
    pageSize: req.query.pageSize,
    startTime: req.query.startTime,
  }
  const statementResult = await getStatements(podcastSlug, episodeResult.publishTimestamp, query)

  const items: IStatement[] = statementResult.items.map(statement => {
    const newStatement: IStatement = {
      endTime: statement.endTime,
      speaker: speakerResult[statement.speaker],
      startTime: statement.startTime,
      words: statement.words,
    }
    return newStatement
  })

  req.items = items
  req.moreResults = statementResult.moreResults
  next()
}
