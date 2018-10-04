export const logError = (message: string, options?: { error?: Error; obj?: any }): Error => {
  let errorString = message
  if (options && options.obj) {
    errorString = `${errorString}: ${JSON.stringify(options.obj, null, 2)}`
  }
  console.error(errorString)

  return options && options.error ? options.error : Error(errorString)
}

export const logStatus = (message: string, obj?: any) => {
  console.log(message)
  console.log(JSON.stringify(obj, null, 2))
}
