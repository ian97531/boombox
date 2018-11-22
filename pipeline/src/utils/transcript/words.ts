import { IWord } from '@boombox/shared'

export const createWordMap = (transcript: IWord[]): Array<Set<IWord>> => {
  const output: Array<Set<IWord>> = []

  for (const word of transcript) {
    const startSecond = Math.floor(word.startTime)
    const endSecond = Math.floor(word.endTime)

    let second = startSecond
    while (second <= endSecond) {
      if (output[second] === undefined) {
        output[second] = new Set()
      }
      output[second].add(word)
      second += 1
    }
  }
  return output
}

export const matchWords = (
  left: IWord[],
  right: IWord[],
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
  input: IWord,
  timeOffset: number = 0,
  swapSpeaker: boolean = false
): IWord => {
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
