export type NextFunction<T> = (message: T) => void

export type RetryFunction = (log?: string) => void
