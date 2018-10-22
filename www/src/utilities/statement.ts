import { IStatement } from '@boombox/shared/src/types/models/transcript'

export const timeDuringStatement = (time: number, statement: IStatement): boolean => {
  return time >= statement.startTime && time < statement.endTime
}

export const timeAfterStatement = (time: number, statement: IStatement): boolean => {
  return time >= statement.endTime
}

export const timeBeforeStatement = (time: number, statement: IStatement): boolean => {
  return time < statement.startTime
}
