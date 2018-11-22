import { ITranscript, IWord, utils } from '@boombox/shared'
import { createWordMap } from './words'

const computeOverlapBetweenWords = (left: IWord, right: IWord, drift: number = 0): number => {
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

  return utils.numbers.round(percentOverlap, 3)
}

export const copySpeakersFromTranscription = (
  speakers: ITranscript,
  words: ITranscript
): ITranscript => {
  const output: ITranscript = []
  const wordMap = createWordMap(speakers)
  let lastSpeaker = speakers[0].speaker
  for (const word of words) {
    const startSecond = Math.floor(word.startTime)
    const endSecond = Math.floor(word.endTime)
    const possibleWords: Set<IWord> = new Set()
    let second = startSecond
    while (second <= endSecond) {
      if (wordMap[second] !== undefined) {
        wordMap[second].forEach(possibleWord => {
          possibleWords.add(possibleWord)
        })
      }
      second += 1
    }

    let bestCandiateOverlap = 0
    let bestCandidateWord: IWord | undefined
    possibleWords.forEach(candidateWord => {
      const overlap = computeOverlapBetweenWords(word, candidateWord)
      if (bestCandidateWord === undefined || overlap > bestCandiateOverlap) {
        bestCandidateWord = candidateWord
        bestCandiateOverlap = overlap
      }
    })

    const speaker = bestCandidateWord ? bestCandidateWord.speaker : lastSpeaker
    lastSpeaker = speaker
    output.push({
      ...word,
      speaker,
    })
  }
  return output
}
