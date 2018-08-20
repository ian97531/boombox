import IError from '../types/IError'

export default class Unauthorized extends Error implements IError {
  public status = 401
  public title = 'Unauthorized'
  constructor(msg?: string) {
    super(msg)
    this.message = msg || ''
    Error.captureStackTrace(this)
  }
}
