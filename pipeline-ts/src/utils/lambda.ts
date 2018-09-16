import { Callback, Context } from 'aws-lambda'

function setupLambda(event: any, context: Context) {
  const buffer = 100
  const timer = setTimeout(() => {
    console.warn('This lambda will timeout in ' + buffer + ' milliseconds.')
  }, context.getRemainingTimeInMillis() - buffer)

  console.log('Received Event: ', event)

  return timer
}

function tearDownLambda(timer: NodeJS.Timer) {
  clearTimeout(timer)
}

export function asyncLambda(
  func: (event?: any, env?: { [id: string]: any }, callback?: Callback) => void
) {
  return (event: any, context: Context, callback: Callback) => {
    const timer = setupLambda(event, context)

    Promise.resolve(func(event, process.env, callback))
      .then(() => {
        tearDownLambda(timer)
      })
      .catch(error => {
        console.error('Exception Thrown: ', error)
        callback(error)
        tearDownLambda(timer)
      })
  }
}

export function lambda(
  func: (event?: any, env?: { [id: string]: any }, callback?: Callback) => void
) {
  return (event: any, context: Context, callback: Callback) => {
    const timer = setupLambda(event, context)

    try {
      func(event, process.env, callback)
    } catch (error) {
      console.error('Exception Thrown: ', error)
      callback(error)
    }

    tearDownLambda(timer)
  }
}
