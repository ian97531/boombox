import { IStatement } from '@boombox/shared/types/models'
import { NextFunction, Response, Router } from 'express'
import validator = require('validator')
import { getEpisode, getSpeakers, getStatements } from '../db'
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
    '/:episodeId',
    validateQueryParams(['pageSize', 'startTime']),
    validateStartTime(),
    validatePageSize(),
    handleAsync(findStatements),
    returnStatements
  )

  return router
}

const findStatements = async (
  req: IStatementListRequest,
  res: Response,
  next: NextFunction
) => {
  const guid = validator.escape(req.params.episodeId)
  const episodeResult = await getEpisode(guid)
  const speakerResult = await getSpeakers(episodeResult.speakers)
  const query = {
    guid,
    pageSize: req.query.pageSize,
    startTime: req.query.startTime,
  }
  const statementResult = await getStatements(query)

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
