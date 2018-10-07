export const logError = (message: string, options?: { error?: Error; obj?: any }) => {
  console.error(message)
  let errorString = message
  if (options && options.obj !== undefined) {
    const objString = JSON.stringify(options.obj, null, 2)
    console.error(objString)
    errorString = `${errorString}: ${objString}`
  }
}

export const logStatus = (message: string, obj?: any) => {
  console.log(message)
  if (obj !== undefined) {
    console.log(JSON.stringify(obj, null, 2))
  }
}
