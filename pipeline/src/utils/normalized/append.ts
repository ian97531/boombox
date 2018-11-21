import { ITranscript, utils } from '@boombox/shared'
import { createTranscriptWord, matchWords } from './transcription'

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
  let rightIndex = 0

  const leftSlice = left.slice(leftIndex).map(word => word.content.toLowerCase())
  while (!matchFound && rightIndex + withOverlap < right.length) {
    const rightWord = right[rightIndex].content.toLowerCase()
    let offset = 0
    while (!matchFound) {
      offset = leftSlice.indexOf(rightWord, offset)
      if (offset !== -1) {
        if (matchWords(left, right, leftIndex + offset, rightIndex, withOverlap)) {
          matchFound = true
          leftIndex += offset
        } else {
          offset += 1
        }
      } else {
        rightIndex += 1
        break
      }
    }
  }

  if (!matchFound) {
    throw Error(
      `Unable to append transcriptions. An overlapping segment of ${withOverlap} words could not be found.`
    )
  }

  // Round the drift to three decimal places.
  const drift = utils.numbers.round(left[leftIndex].startTime - right[rightIndex].startTime, 3)
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
