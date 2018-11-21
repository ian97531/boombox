import { IGoogleTranscription, IStatementDBRecord, ITranscript, IWord } from '@boombox/shared'
import { GoogleTranscription } from './GoogleTranscription'

const TERMINATING_PUNCTUATION = ['.', '?', '!']

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

export const createWordMap = (transcript: ITranscript): IWord[][] => {
  const output: IWord[][] = []

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

export const computeOverlapBetweenWords = (left: IWord, right: IWord, drift: number): number => {
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

const getDominantSpeaker = (words: IWord[]): number => {
  const speakerDurations: number[] = []

  for (const word of words) {
    const duration = word.endTime - word.startTime
    speakerDurations[word.speaker] = speakerDurations[word.speaker]
      ? speakerDurations[word.speaker] + duration
      : duration
  }

  let dominantSpeaker = 0
  speakerDurations.reduce((largestDuration, currentDuration, currentSpeaker) => {
    dominantSpeaker = currentDuration > largestDuration ? currentSpeaker : dominantSpeaker
    return currentDuration > largestDuration ? currentDuration : largestDuration
  }, 0)

  return dominantSpeaker
}

const capitalize = (word: string): string => {
  const letters = word.split('')
  letters[0] = letters[0].toUpperCase()
  return letters.join('')
}

const punctuate = (word: string): string => {
  const lastChar = word[word.length - 1]
  if (TERMINATING_PUNCTUATION.indexOf(lastChar) === -1) {
    return `${word}.`
  } else {
    return word
  }
}

export const getStatements = (transcript: ITranscript): IStatementDBRecord[] => {
  let currentSentenceStartIndex = 0
  const statements: IStatementDBRecord[] = []

  transcript.forEach((word, index) => {
    const lastChar = word.content[word.content.length - 1]
    const nextWord = transcript[index + 1]
    if (
      TERMINATING_PUNCTUATION.indexOf(lastChar) !== -1 ||
      (nextWord && word.endTime !== nextWord.startTime)
    ) {
      const possibleSentence = transcript.slice(currentSentenceStartIndex, index + 1)
      const sentences: IStatementDBRecord[] = []

      // Break apart into runs of words based on the speaker value.
      let currentSpeaker = possibleSentence[0].speaker
      let currentRun: IWord[] = []
      const speakerRuns: IWord[][] = []
      possibleSentence.forEach((sentenceWord, sentenceWordIndex) => {
        if (sentenceWordIndex === possibleSentence.length - 1) {
          currentRun.push(sentenceWord)
          speakerRuns.push(currentRun)
        } else {
          if (sentenceWord.speaker !== currentSpeaker) {
            speakerRuns.push(currentRun)
            currentRun = []
            currentSpeaker = sentenceWord.speaker
          }
          currentRun.push(sentenceWord)
        }
      })

      // Runs less than 4 words long get coalesced into a single run.
      const survivingRuns: IWord[][] = []
      speakerRuns.forEach(run => {
        if (run.length > 4) {
          survivingRuns.push(run)
        } else {
          const lastRun = survivingRuns.pop()
          if (lastRun) {
            survivingRuns.push([...lastRun, ...run])
          } else {
            survivingRuns.push(run)
          }
        }
      })

      survivingRuns.forEach(run => {
        const speaker = getDominantSpeaker(run)
        const sentence: IStatementDBRecord = {
          endTime: run[run.length - 1].endTime,
          speaker,
          startTime: run[0].startTime,
          words: run,
        }
        sentences.push(sentence)
      })

      // If the previous statment was spoken by the same speaker, merge this sentence with it.
      sentences.forEach(sentence => {
        if (statements.length) {
          const previousStatement = statements[statements.length - 1]
          if (previousStatement.speaker === sentence.speaker) {
            previousStatement.words = [...previousStatement.words, ...sentence.words]
            previousStatement.endTime = sentence.endTime
          } else {
            statements.push(sentence)
          }
        } else {
          statements.push(sentence)
        }
      })

      currentSentenceStartIndex = index + 1
    }
  })

  statements.forEach(statement => {
    const firstWord = statement.words[0]
    const lastWord = statement.words[statement.words.length - 1]
    firstWord.content = capitalize(firstWord.content)
    lastWord.content = punctuate(lastWord.content)
  })

  return statements
}

export const normalizeGoogleTranscription = (
  transcript: IGoogleTranscription,
  startTime: number = 0
): ITranscript => {
  const google = new GoogleTranscription(transcript, startTime)
  return google.getNormalizedTranscription()
}
