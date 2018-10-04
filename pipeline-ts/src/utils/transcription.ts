import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import { logError } from './status'

const matchSet = (
  left: ITranscript,
  right: ITranscript,
  leftIndex: number,
  rightIndex: number,
  length: number
): boolean => {
  let offset = 0
  let match = true
  while (
    match &&
    left.length < leftIndex + offset &&
    right.length < rightIndex + offset &&
    offset <= length
  ) {
    match =
      left[leftIndex + offset].content.toLowerCase() ===
      right[rightIndex + offset].content.toLowerCase()
    offset += 1
  }
  return match
}

export const appendTranscriptions = (left: ITranscript, right: ITranscript, withOverlap: number = 10): ITranscript => {
  let leftStartIndex = 0
  let leftStartIndexFound = false
  while (leftStartIndexFound && leftStartIndex < left.length) {
    const word = left[leftStartIndex]
    leftStartIndexFound = word.startTime >= right[0].startTime
    leftStartIndex += 1
  }

  if (!leftStartIndexFound) {
    throw logError('Unable to append transcriptions because their timecodes do not overlap.')
  }

  let matchFound = false
  let rightStartIndex = 0
  let leftOffset = 0
  let offset = 0

  while (!matchFound && leftStartIndex + offset + withOverlap) < left.length) {
    
  }

}
