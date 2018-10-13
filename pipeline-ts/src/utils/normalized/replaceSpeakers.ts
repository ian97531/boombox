import { ITranscript, ITranscriptWord } from '@boombox/shared/src/types/models/transcript'
import { computeOverlapBetweenWords, createWordMap } from './transcription'

export const replaceSpeakers = (target: ITranscript, withSpeakers: ITranscript): ITranscript => {
  const output: ITranscript = []
  const wordMap = createWordMap(withSpeakers)
  let drift = target[0].startTime - withSpeakers[0].startTime
  let lastTargetSpeaker: number | undefined
  let lastReplacementSpeaker: number | undefined

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
      if (overlap && (bestOverlap === undefined || bestOverlap < overlap)) {
        bestOverlap = overlap
        bestWord = candidateWord
      }
    }

    if (bestWord) {
      let newSpeaker = bestWord.speaker

      // Only change the speaker when both transcriptions agree that the speaker should change.
      if (lastReplacementSpeaker !== undefined && lastTargetSpeaker !== undefined) {
        newSpeaker = lastReplacementSpeaker
        if (bestWord.speaker !== lastReplacementSpeaker) {
          if (word.speaker !== lastTargetSpeaker) {
            newSpeaker = bestWord.speaker
            lastReplacementSpeaker = bestWord.speaker
            lastTargetSpeaker = word.speaker
          }
        }
      } else {
        lastReplacementSpeaker = bestWord.speaker
        lastTargetSpeaker = word.speaker
      }

      output.push({
        ...word,
        awsSpeaker: word.speaker === 0 ? 1 : 0,
        speaker: newSpeaker,
        watsonSpeaker: bestWord.speaker === 0 ? 0 : 1,
      })
      if (bestWord.content.toLowerCase() === word.content.toLowerCase()) {
        drift = word.endTime - bestWord.endTime
      }
    }
  }

  // Look for runs of disagreeing speakers that are 5 words or longer and fix them.
  let watsonDisagreeRun = 0
  let watsonDisagreeStart: number | undefined
  let watsonDisagreeCurrent: number | undefined
  let index = 0
  while (index < output.length) {
    const word = output[index]

    if (word.speaker !== word.watsonSpeaker) {
      if (!watsonDisagreeStart) {
        watsonDisagreeStart = word.startTime
      }
      watsonDisagreeCurrent = word.endTime
      watsonDisagreeRun += 1
    } else {
      if (watsonDisagreeStart && watsonDisagreeCurrent) {
        const watsonDisagreeTime = watsonDisagreeCurrent - watsonDisagreeStart
        if (watsonDisagreeRun + watsonDisagreeTime > 7) {
          while (watsonDisagreeRun) {
            output[index - watsonDisagreeRun].speaker = output[index - watsonDisagreeRun]
              .watsonSpeaker as number
            watsonDisagreeRun -= 1
          }
        }
      }
      watsonDisagreeRun = 0
      watsonDisagreeStart = undefined
    }

    index += 1
  }

  let awsDisagreeRun = 0
  let awsDisagreeStart: number | undefined
  let awsDisagreeCurrent: number | undefined
  index = 0
  while (index < output.length) {
    const word = output[index]
    if (word.speaker !== word.awsSpeaker) {
      if (!awsDisagreeStart) {
        awsDisagreeStart = word.startTime
      }
      awsDisagreeCurrent = word.endTime
      awsDisagreeRun += 1
    } else {
      if (awsDisagreeStart && awsDisagreeCurrent) {
        const awsDisagreeTime = awsDisagreeCurrent - awsDisagreeStart
        if (awsDisagreeRun + awsDisagreeTime > 8) {
          while (awsDisagreeRun) {
            output[index - awsDisagreeRun].speaker = output[index - awsDisagreeRun]
              .awsSpeaker as number
            awsDisagreeRun -= 1
          }
        }
      }

      awsDisagreeRun = 0
      awsDisagreeStart = undefined
    }

    index += 1
  }

  return output
}
