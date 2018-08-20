import { NextFunction, Response, Router } from 'express'
import validator = require('validator')
import {
  validatePageSize,
  validateQueryParams,
  validateStartTime,
} from '../middleware'
import IRequest from '../types/IRequest'
import returnItems from '../utils/returnItems'

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

const findStatements = (req: IRequest, res: Response, next: NextFunction) => {
  const episodeId = validator.escape(req.params.episodeId)
  req.items = ['Hello World ', episodeId]
  next()
}
