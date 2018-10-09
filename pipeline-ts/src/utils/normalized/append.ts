import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import { computeDistanceBetweenWords, createTranscriptWord, matchWords } from './transcription'

export const appendTranscriptions = (
  left: ITranscript,
  right: ITranscript,
  withOverlap: number = 10
): ITranscript => {
  let leftIndex = 0
  let leftIndexFound = false
  while (leftIndexFound && leftIndex < left.length) {
    const word = left[leftIndex]
    leftIndexFound = word.startTime >= right[0].startTime
    leftIndex += 1
  }

  if (!leftIndexFound) {
    throw Error('Unable to append transcriptions because their timecodes do not overlap.')
  }

  let matchFound = false
  let rightIndex = 1
  let rightOffset = 0

  while (!matchFound && leftIndex < left.length) {
    while (
      !matchFound &&
      right.length < rightIndex + rightOffset &&
      computeDistanceBetweenWords(left[leftIndex], right[rightIndex + rightOffset]) < 5
    ) {
      matchFound = matchWords(left, right, leftIndex, rightIndex + rightOffset, withOverlap)

      if (!matchFound) {
        rightOffset += 1
      }
    }

    if (!matchFound) {
      rightOffset = 0
      rightIndex += 1
      leftIndex += 1
    } else {
      rightIndex += rightOffset
      rightOffset = 0
    }
  }

  if (!matchFound) {
    throw Error(
      `Unable to append transcriptions. An overlapping segment of ${withOverlap} words could not be found.`
    )
  }

  // Round the drift to three decimal places.
  const drift = Number((left[leftIndex].startTime - right[rightIndex].startTime).toFixed(3))
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
