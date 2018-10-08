import { ENV, ILambdaRequest, TimeoutCallback } from '../../types/lambda'

export class LambdaRequestController<Input, Output> {
  public input: Input
  public nextMessages: Array<{ delay: number; message: Output }> = []
  public retry = false
  public retryDelay = 0
  public onTimeoutHandler: TimeoutCallback

  constructor(input: Input) {
    this.input = input
  }

  public getRequest(): ILambdaRequest<Input, Output> {
    const self = this
    return {
      getEnvVariable(environmentVariable: ENV): string | number {
        const value = process.env[environmentVariable]
        if (value === undefined) {
          throw Error(`The ${environmentVariable} environment variable is not defined.`)
        }
        return value
      },
      input: self.input,
      log(message: string) {
        console.log(message)
      },
      nextFunction(message: Output, delay: number = 0) {
        self.nextMessages.push({ delay, message })
      },
      onTimeout(func: TimeoutCallback) {
        self.onTimeoutHandler = func
      },
      retryFunction(delay: number = 0) {
        self.retry = true
        self.retryDelay = delay
      },
    }
  }
}
