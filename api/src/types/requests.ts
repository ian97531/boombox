import { IStatement } from '@boombox/shared/types/models'
import { Request } from 'express'

interface IListRequest<RequestObject> extends Request {
  moreResults: boolean
  items: RequestObject[]
}

export interface IStatementListRequest extends IListRequest<IStatement> {}
