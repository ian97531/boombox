export type LambdaCallback = () => Promise<void>

export class Lambda {
  public static getEnvVariable(variableName: string): string | number {
    const value = process.env[variableName]
    if (value === undefined) {
      throw Error(`The environment variable ${variableName} does not exist.`)
    }
    return value
  }

  public onCompleteHandlers: LambdaCallback[] = []
  public onTimeoutHandlers: LambdaCallback[] = []

  public addOnCompleteHandler(func: LambdaCallback) {
    this.onCompleteHandlers.push(func)
  }

  public addOnTimeoutHanlder(func: LambdaCallback) {
    this.onTimeoutHandlers.push(func)
  }

  public log(message: string, obj?: any) {
    console.log(message)
    if (obj !== undefined) {
      console.log(JSON.stringify(obj, null, 2))
    }
  }

  public logError(message: string, error?: Error) {
    this.log(message)
    if (error) {
      this.log(`Error Name: ${error.name}`)
      this.log(`Error Message: ${error.message}`)
      if (error.stack) {
        this.log(`Error Stack: ${error.stack}`)
      }
    }
  }
}
