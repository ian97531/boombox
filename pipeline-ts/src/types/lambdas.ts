export type NextFunction<T> = (message: T, delaySeconds?: number) => void

export type RetryFunction = (delaySeconds?: number) => void

export type TimeoutCallback = (retry: RetryFunction) => Promise<void>
