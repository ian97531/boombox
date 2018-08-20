import { Request } from 'express'

export default interface IRequest extends Request {
  hasMore?: boolean
  items?: any[]
}
