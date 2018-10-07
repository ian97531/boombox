import { ITranscript, ITranscriptWord } from '@boombox/shared/src/types/models/transcript'
import { computeOverlapBetweenWords, createWordMap } from './transcription'

export const replaceSpeakers = (target: ITranscript, withSpeakers: ITranscript): ITranscript => {
  const output: ITranscript = []
  const drift = target[0].startTime - withSpeakers[0].startTime
  const wordMap = createWordMap(withSpeakers, drift)

  for (const word of target) {
    const startSecond = Math.floor(word.startTime)
    const endSecond = Math.floor(word.endTime)
    const candidateWords: ITranscriptWord[] = []
    let second = startSecond
    while (second <= endSecond) {
      if (wordMap[second] !== undefined) {
        candidateWords.push(...wordMap[second])
      }
      second += 1
    }

    let bestOverlap: number | undefined
    let bestWord: ITranscriptWord | undefined
    for (const candidateWord of candidateWords) {
      const overlap = computeOverlapBetweenWords(word, candidateWord, drift)
      if (bestOverlap === undefined || bestOverlap < overlap) {
        bestOverlap = overlap
        bestWord = candidateWord
      }
    }

    if (bestWord) {
      output.push({
        ...word,
        speaker: bestWord.speaker,
      })
    } else {
      output.push({ ...word })
    }
  }

  return output
}
