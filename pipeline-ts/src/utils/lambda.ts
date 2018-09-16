import { Callback, Context } from 'aws-lambda'

export function asyncLambda(
  func: (event?: any, env?: { [id: string]: any }, callback?: Callback) => void
) {
  return (event: any, context: Context, callback: Callback) => {
    // Set a log a heartbeat every 5 seconds to help us debug functions that exceed their timeout.
    const interval = 5000
    let intervals = 0
    const timer = setInterval(() => {
      intervals += 1
      console.log('Execution Time: ' + (intervals * interval) / 1000 + ' seconds')
    }, interval)

    // Log the received event.
    console.log('Received Event: ', event)
    console.log('Context: ', context)

    Promise.resolve(func(event, process.env, callback))
      .then(() => {
        clearInterval(timer)
      })
      .catch(error => {
        console.error('Exception Thrown: ', error)
        callback(error)
        clearInterval(timer)
      })
  }
}

export function lambda(
  func: (event?: any, env?: { [id: string]: any }, callback?: Callback) => void
) {
  return (event: any, context: Context, callback: Callback) => {
    // Set a log a heartbeat every 5 seconds to help us debug functions that exceed their timeout.
    const interval = 5000
    let intervals = 0
    const timer = setInterval(() => {
      intervals += 1
      console.log('Execution Time: ' + (intervals * interval) / 1000 + ' seconds')
    }, interval)

    // Log the received event.
    console.log('Received Event: ', event)

    try {
      func(event, process.env, callback)
    } catch (error) {
      console.error('Exception Thrown: ', error)
      callback(error)
    }

    clearInterval(timer)
  }
}
