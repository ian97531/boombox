import { IAudioMetadata } from '@boombox/shared/src/types/models/audio'
import Axios from 'axios'
import { NextFunction, Response, Router } from 'express'
import * as validator from 'validator'
import { BadRequest } from '../errors'
import { handleAsync, validateQueryParams, validateUrl } from '../middleware'
import { returnItem } from '../middleware/response'
import { IItemRequest } from '../types/requests'

export default function() {
  const router = Router()

  router.get(
    '/metadata',
    validateQueryParams(['url']),
    validateUrl(),
    handleAsync(getAudioMetadata),
    returnItem
  )

  return router
}

const getAudioMetadata = async (
  req: IItemRequest<IAudioMetadata>,
  res: Response,
  next: NextFunction
) => {
  const audioUrl = req.query.url
  const audioResponse = await Axios.head(audioUrl)
  if (audioResponse.status === 200) {
    const isLength = validator.isInt(audioResponse.headers['content-length'], { min: 0 })
    const isUrl = validator.isURL(audioResponse.request.res.responseUrl, {
      allow_protocol_relative_urls: false,
      allow_trailing_dot: false,
      require_host: true,
      require_protocol: true,
      require_tld: true,
      require_valid_protocol: true,
    })

    if (isLength && isUrl) {
      req.item = {
        contentLength: validator.toInt(audioResponse.headers['content-length'], 10),
        url: audioResponse.request.res.responseUrl,
      }
      next()
    } else {
      return next(new BadRequest('Unable to load metadata for the requested audio url.'))
    }
  } else {
    return next(new BadRequest('Unable to load metadata for the requested audio url.'))
  }
}
