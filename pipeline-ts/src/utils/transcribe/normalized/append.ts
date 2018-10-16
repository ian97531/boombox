import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import { round } from '@boombox/shared/src/utils/numbers'
import { computeDistanceBetweenWords, createTranscriptWord, matchWords } from './transcription'

export const appendTranscriptions = (
  left: ITranscript,
  right: ITranscript,
  withOverlap: number = 10
): ITranscript => {
  let leftIndex = 0
  let leftIndexFound = false
  while (!leftIndexFound && leftIndex < left.length) {
    const word = left[leftIndex]
    leftIndexFound = word.startTime >= right[0].startTime
    leftIndex += 1
  }

  if (!leftIndexFound) {
    throw Error('Unable to append transcriptions because their timecodes do not overlap.')
  }

  let matchFound = false
  let rightIndex = 1

  while (!matchFound && leftIndex < left.length) {
    while (
      !matchFound &&
      rightIndex < right.length &&
      computeDistanceBetweenWords(left[leftIndex], right[rightIndex]) < 5
    ) {
      matchFound = matchWords(left, right, leftIndex, rightIndex, withOverlap)

      if (!matchFound) {
        rightIndex += 1
      }
    }

    if (!matchFound) {
      rightIndex = 0
      leftIndex += 1
    }
  }

  if (!matchFound) {
    throw Error(
      `Unable to append transcriptions. An overlapping segment of ${withOverlap} words could not be found.`
    )
  }

  // Round the drift to three decimal places.
  const drift = round(left[leftIndex].startTime - right[rightIndex].startTime, 3)
  const swapSpeakers = left[leftIndex].speaker !== right[rightIndex].speaker

  let index = 0
  const output: ITranscript = []
  while (index < leftIndex + right.length - rightIndex) {
    if (index <= leftIndex) {
      output.push(createTranscriptWord(left[index]))
    } else {
      output.push(createTranscriptWord(right[index - leftIndex + rightIndex], drift, swapSpeakers))
    }

    index += 1
  }

  return output
}

export const appendAllTranscriptions = (transcriptions: ITranscript[]): ITranscript => {
  let index = 1
  let output = transcriptions[0]
  while (index < transcriptions.length) {
    output = appendTranscriptions(output, transcriptions[index])
    index += 1
  }
  return output
}
