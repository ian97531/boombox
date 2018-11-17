import { ITranscript, ITranscriptWord } from '@boombox/shared'

export const matchWords = (
  left: ITranscript,
  right: ITranscript,
  leftIndex: number,
  rightIndex: number,
  length: number
): boolean => {
  let offset = 0
  let match = false
  while (
    leftIndex + offset < left.length &&
    rightIndex + offset < right.length &&
    offset <= length
  ) {
    match =
      left[leftIndex + offset].content.toLowerCase() ===
      right[rightIndex + offset].content.toLowerCase()
    offset += 1

    if (!match) {
      break
    }
  }
  return match
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

export const createWordMap = (transcript: ITranscript): ITranscriptWord[][] => {
  const output: ITranscriptWord[][] = []

  for (const word of transcript) {
    let startSecond = Math.floor(word.startTime)
    startSecond = startSecond ? startSecond - 1 : 0
    const endSecond = Math.floor(word.endTime) + 1
    const seconds = endSecond - startSecond

    let index = 0
    while (index <= seconds) {
      const second = startSecond + index
      if (output[second] === undefined) {
        output[second] = []
      }
      output[second].push(word)
      index += 1
    }
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

  const sameWord = left.content.toLowerCase() === right.content.toLowerCase()

  return percentOverlap > 0 && sameWord ? 1 : percentOverlap
}
