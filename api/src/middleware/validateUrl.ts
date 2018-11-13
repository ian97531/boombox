import { NextFunction, Request, Response } from 'express'
import * as validator from 'validator'
import { BadRequest } from '../errors'

export default function() {
  return (req: Request, res: Response, next: NextFunction) => {
    const url = req.query.url

    let valid = false
    if (url) {
      valid = validator.isURL(url, {
        allow_protocol_relative_urls: false,
        allow_trailing_dot: false,
        require_host: true,
        require_protocol: true,
        require_tld: true,
        require_valid_protocol: true,
      })
    }

    if (valid) {
      next()
    } else {
      return next(
        new BadRequest('A "url" query parameter with a valid URL is required by this endpoint.')
      )
    }
  }
}
