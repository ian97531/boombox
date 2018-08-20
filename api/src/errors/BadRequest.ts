import IError from '../types/IError'

export default class BadRequest extends Error implements IError {
  public status = 400
  public title = 'Bad Request'
  constructor(msg?: string) {
    super(msg)
    this.message = msg || ''
    Error.captureStackTrace(this)
  }
}
