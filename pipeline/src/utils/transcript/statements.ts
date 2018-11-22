import { IStatementDBRecord, ITranscript, IWord } from '@boombox/shared'

const TERMINATING_PUNCTUATION = ['.', '?', '!']

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

const getDominantSpeaker = (words: IWord[]): number => {
  const speakers: number[] = []

  for (const word of words) {
    speakers[word.speaker] = speakers[word.speaker] ? speakers[word.speaker] + 1 : 1
  }

  let dominantSpeaker = 0
  speakers.reduce((mostWords, currentWords, currentSpeaker) => {
    dominantSpeaker = currentWords > mostWords ? currentSpeaker : dominantSpeaker
    return currentWords > mostWords ? currentWords : mostWords
  }, 0)

  return dominantSpeaker
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

export const getStatements = (transcript: ITranscript): IStatementDBRecord[] => {
  let currentSentenceStartIndex = 0
  const statements: IStatementDBRecord[] = []

  transcript.forEach((word, index) => {
    const lastChar = word.content[word.content.length - 1]
    if (TERMINATING_PUNCTUATION.indexOf(lastChar) !== -1) {
      const sentence = transcript.slice(currentSentenceStartIndex, index + 1)
      const speaker = getDominantSpeaker(sentence)
      const firstWord = sentence[0]
      const lastWord = sentence[sentence.length - 1]
      firstWord.content = capitalize(firstWord.content)
      lastWord.content = punctuate(lastWord.content)

      const statement: IStatementDBRecord = {
        endTime: sentence[sentence.length - 1].endTime,
        speaker,
        startTime: sentence[0].startTime,
        words: sentence,
      }

      if (statements.length) {
        const previousStatement = statements[statements.length - 1]
        if (previousStatement.speaker === statement.speaker) {
          previousStatement.endTime = statement.endTime
          previousStatement.words = [...previousStatement.words, ...statement.words]
        } else {
          statements.push(statement)
        }
      } else {
        statements.push(statement)
      }

      currentSentenceStartIndex = index + 1
    }
  })

  return statements
}
