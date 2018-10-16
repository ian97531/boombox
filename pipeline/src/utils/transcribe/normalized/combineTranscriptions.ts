import { ITranscript, ITranscriptWord } from '@boombox/shared/src/types/models/transcript'
import { round } from '@boombox/shared/src/utils/numbers'
import { computeOverlapBetweenWords, createWordMap } from './transcription'

interface ICandidateTranscriptWord extends ITranscriptWord {
  overlap: number
}

interface ICombinedTranscriptWord extends ITranscriptWord {
  readonly originalWord: ITranscriptWord
  readonly candidateWords: ICandidateTranscriptWord[]
}

type ICombinedTranscript = ICombinedTranscriptWord[]

export const combineTranscriptions = (
  target: ITranscript,
  withSpeakers: ITranscript
): ICombinedTranscript => {
  const output: ICombinedTranscript = []
  const wordMap = createWordMap(withSpeakers)
  let drift = target[0].startTime - withSpeakers[0].startTime
  let matchingSpeakers = 0

  for (const word of target) {
    const startSecond = Math.floor(word.startTime)
    const endSecond = Math.floor(word.endTime)
    const possibleWords: ITranscriptWord[] = []
    let second = startSecond
    while (second <= endSecond) {
      if (wordMap[second] !== undefined) {
        for (const possibleWord of wordMap[second]) {
          if (possibleWords.indexOf(possibleWord) === -1) {
            possibleWords.push(possibleWord)
          }
        }
      }
      second += 1
    }

    const candidateWords: ICandidateTranscriptWord[] = []
    for (const candidateWord of possibleWords) {
      const overlap = computeOverlapBetweenWords(word, candidateWord, drift)
      if (overlap) {
        candidateWords.push({
          ...candidateWord,
          overlap: round(overlap, 3),
        })
      }
    }

    candidateWords.sort((a, b) => {
      return b.overlap - a.overlap
    })

    if (candidateWords.length) {
      output.push({
        ...word,
        candidateWords,
        originalWord: word,
        speaker: candidateWords[0].speaker,
      })
      if (candidateWords[0].content.toLowerCase() === word.content.toLowerCase()) {
        drift = word.endTime - candidateWords[0].endTime
      }
      if (word.speaker === candidateWords[0].speaker) {
        matchingSpeakers += 1
      }
    }
  }

  // If the speakers match less than half the time, swap the speakers.
  const matchingSpeakerRatio = matchingSpeakers / output.length
  if (matchingSpeakerRatio < 0.5) {
    for (const word of output) {
      word.originalWord.speaker = word.originalWord.speaker === 0 ? 1 : 0
    }
  }

  // Speakers only change when both transcriptions agree.
  let lastSpeaker: number | undefined
  for (const word of output) {
    if (word.originalWord.speaker === word.candidateWords[0].speaker) {
      word.speaker = word.originalWord.speaker
    } else if (lastSpeaker !== undefined) {
      word.speaker = lastSpeaker
    } else {
      word.speaker = word.candidateWords[0].speaker
    }
    lastSpeaker = word.speaker
  }

  // If AWS disagrees with the last word in a statment, give it to AWS.
  let index = 0
  while (index < output.length) {
    if (
      output[index].speaker !== output[index].originalWord.speaker &&
      output[index + 1] &&
      output[index].speaker !== output[index + 1].speaker
    ) {
      output[index].speaker = output[index].originalWord.speaker
    }
    index += 1
  }

  // Any runs of 4 words or more that AWS disagrees with should go to AWS.
  index = 0
  while (index < output.length) {
    if (output[index].speaker !== output[index].originalWord.speaker) {
      const awsSpeaker = output[index].originalWord.speaker
      let runLength = 1
      while (
        output[index + runLength] &&
        output[index + runLength].originalWord.speaker === awsSpeaker &&
        output[index + runLength].speaker !== awsSpeaker
      ) {
        runLength += 1
      }
      if (runLength >= 3) {
        let run = 0
        while (run < runLength) {
          output[index + run].speaker = awsSpeaker
          run += 1
        }
      }
      index += runLength
    } else {
      index += 1
    }
  }

  let previousSpeaker: number | undefined
  for (const word of output) {
    if (word.speaker !== word.candidateWords[0].speaker) {
      const sameWord =
        word.candidateWords[0].content.toLowerCase() === word.originalWord.content.toString()
      const confidence = word.candidateWords[0].confidence
      const diff = confidence - word.originalWord.confidence
      if (
        sameWord &&
        confidence > 0.97 &&
        diff > 0.15 &&
        previousSpeaker !== undefined &&
        previousSpeaker === word.candidateWords[0].speaker
      ) {
        word.speaker = word.candidateWords[0].speaker
      }
      previousSpeaker = word.speaker
    }
  }

  return output
}
