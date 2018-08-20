import IError from '../types/IError'

export default class Forbidden extends Error implements IError {
  public status = 403
  public title = 'Forbidden'
  constructor(msg?: string) {
    super(msg)
    this.message = msg || ''
    Error.captureStackTrace(this)
  }
}
