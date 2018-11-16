import { IError } from 'types/error'

export default class NotFound extends Error implements IError {
  public status = 404
  public title = 'Not Found'
  constructor(msg?: string) {
    super(msg)
    this.message = msg || ''
    Error.captureStackTrace(this)
  }
}
