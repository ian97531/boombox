import { NextFunction, Response, Router } from 'express'
import validator = require('validator')
import { queryStatements } from '../db/statements'
import {
  validatePageSize,
  validateQueryParams,
  validateStartTime,
} from '../middleware'
import returnItems from '../responses/returnTimedList'
import { IStatement } from '../types/models'
import { IStatementListRequest } from '../types/requests'

export default function() {
  const router = Router()

  router.get(
    '/:episodeId',
    validateQueryParams(['pageSize', 'startTime']),
    validateStartTime(),
    validatePageSize(),
    findStatements,
    returnItems
  )

  return router
}

const findStatements = (
  req: IStatementListRequest,
  res: Response,
  next: NextFunction
) => {
  const query = {
    guid: validator.escape(req.params.episodeId),
    pageSize: req.query.pageSize,
    startTime: req.query.startTime,
  }
  queryStatements(query, (error: AWS.AWSError, data: IStatement[]) => {
    if (error) {
      console.error(error)
      throw new Error()
    } else {
      req.items = data
    }
    next()
  })
}
