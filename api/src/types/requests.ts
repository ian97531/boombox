import { Request } from 'express'
import { IStatement } from './models'

interface IListRequest<RequestObject> extends Request {
  moreResults: boolean
  items: RequestObject[]
}

export interface IStatementListRequest extends IListRequest<IStatement> {}
