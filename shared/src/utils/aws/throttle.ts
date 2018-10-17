import { sleep } from '../timing'

export const retryThrottledRequests = async <T>(
  func: () => Promise<T>,
  timeoutMilliseconds: number = 10000,
  waitMilliseconds: number = 1000
): Promise<T> => {
  const startTime = Date.now()
  let response: T | undefined
  let timedOut = false
  while (!response && !timedOut) {
    try {
      response = await func()
    } catch (error) {
      if (error.name === 'ThrottlingException') {
        await sleep(waitMilliseconds)
      } else {
        throw error
      }
    }
    timedOut = Date.now() - startTime > timeoutMilliseconds
  }
  if (!response) {
    throw Error('retryThrottledRequests timed out.')
  }
  return response
}
