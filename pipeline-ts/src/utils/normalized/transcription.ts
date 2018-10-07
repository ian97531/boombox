import { ITranscript, ITranscriptWord } from '@boombox/shared/src/types/models/transcript'

export const matchWords = (
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

export const computeDistanceBetweenWords = (
  left: ITranscriptWord,
  right: ITranscriptWord
): number => {
  return Math.abs(left.startTime - right.startTime)
}

export const createTranscriptWord = (
  input: ITranscriptWord,
  timeOffset: number = 0,
  swapSpeaker: boolean = false
): ITranscriptWord => {
  let speaker = input.speaker
  if (swapSpeaker) {
    speaker = input.speaker === 0 ? 1 : 0
  }

  return {
    ...input,
    endTime: input.endTime + timeOffset,
    speaker,
    startTime: input.startTime + timeOffset,
  }
}

export const createWordMap = (transcript: ITranscript, drift: number): ITranscriptWord[][] => {
  const output: ITranscriptWord[][] = []

  for (const word of transcript) {
    const startSecond = Math.floor(word.startTime + drift)

    if (output[startSecond] === undefined) {
      output[startSecond] = []
    }

    output[startSecond].push(word)
  }

  return output
}

export const computeOverlapBetweenWords = (
  left: ITranscriptWord,
  right: ITranscriptWord,
  drift: number
): number => {
  const rightStart = right.startTime + drift
  const rightEnd = right.endTime + drift

  const leftLength = left.endTime - left.startTime
  const rightLength = rightEnd - rightStart

  let overlap = 0

  if (left.endTime < rightStart || rightEnd < left.startTime) {
    overlap = 0
  } else {
    const lastStartTime = left.startTime < rightStart ? rightStart : left.startTime
    const firstEndTime = left.endTime < rightEnd ? left.endTime : rightEnd
    overlap = firstEndTime - lastStartTime
  }

  const totalLength = leftLength + rightLength - overlap
  const percentOverlap = overlap / totalLength
  return percentOverlap
}
