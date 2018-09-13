import { IStatement, IStatementDBResult } from '@boombox/shared/types/models'
import { NextFunction, Response, Router } from 'express'
import validator = require('validator')
import { getEpisodeForSlugs, getSpeakers, getStatements } from '../db'
import { handleAsync, validatePageSize, validateQueryParams, validateStart } from '../middleware'
import { returnStatements } from '../responses/returnList'
import { IListRequest } from '../types/requests'

export default function() {
  const router = Router()

  router.get(
    '/:podcastSlug/episodes/:episodeSlug/statements',
    validateQueryParams(['pageSize', 'start']),
    validateStart(),
    validatePageSize(),
    handleAsync(findStatements),
    returnStatements
  )

  return router
}

const findStatements = async (req: IListRequest<IStatement>, res: Response, next: NextFunction) => {
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
