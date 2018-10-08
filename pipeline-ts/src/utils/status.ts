export const logError = (message: string, error?: Error) => {
  console.error(message)
  if (error) {
    console.error(`Error Name: ${error.name}`)
    console.error(`Error Message: ${error.message}`)
    if (error.stack) {
      console.error(`Error Stack: ${error.stack}`)
    }
  }
}

export const logStatus = (message: string, obj?: any) => {
  console.log(message)
  if (obj !== undefined) {
    console.log(JSON.stringify(obj, null, 2))
  }
}
