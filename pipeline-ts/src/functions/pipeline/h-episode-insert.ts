import { putIStatmentDBRecord } from '@boombox/shared/src/db/statements'
import {
  IStatementDBRecord,
  ITranscript,
  ITranscriptWord,
} from '@boombox/shared/src/types/models/transcript'
import { IEpisodeInsertMessage, IJobInput } from '../../types/jobs'
import { RetryFunction, TimeoutCallback } from '../../types/lambdas'
import { checkFileExists, getJsonFile, putJsonFile } from '../../utils/aws/s3'
import { getBucket, getStatementsTableWriteCapacity } from '../../utils/environment'
import { jobLambda } from '../../utils/job'

let continueInserting = false
let insertQueueFilename: string
let insertQueue: ITranscript
let safeToWriteQueue = true

const sleep = async (milliseconds: number) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const episodeInsert = async (input: IJobInput<IEpisodeInsertMessage>) => {
  const functionStartTime = Date.now()
  const bucket = getBucket()
  const writeCapacityUnits = getStatementsTableWriteCapacity()
  let writeCapacityConsumed = 0

  insertQueueFilename = input.message.insertQueueFile
  if (await checkFileExists(bucket, insertQueueFilename)) {
    insertQueue = (await getJsonFile(bucket, insertQueueFilename)) as ITranscript
    while (continueInserting && insertQueue.length) {
      safeToWriteQueue = false
      let word = insertQueue.shift() as ITranscriptWord
      let endTime = word.endTime
      const startTime = word.startTime
      const currentSpeaker = word.speaker
      const words: ITranscriptWord[] = []
      while (currentSpeaker === word.speaker) {
        words.push(word)
        endTime = word.endTime
        word = insertQueue.shift() as ITranscriptWord
      }
      insertQueue.unshift(word)
      safeToWriteQueue = true
      const record: IStatementDBRecord = {
        endTime,
        speaker: word.speaker,
        startTime,
        words,
      }

      try {
        const response = await putIStatmentDBRecord(record)
        if (response.ConsumedCapacity && response.ConsumedCapacity.CapacityUnits) {
          writeCapacityConsumed += response.ConsumedCapacity.CapacityUnits
          const currentTime = Date.now()
          const seconds = (currentTime - functionStartTime) / 1000
          const availableWriteCapacity = seconds * writeCapacityUnits
          if (availableWriteCapacity < writeCapacityConsumed) {
            await sleep(1000)
          }
        }
      } catch (error) {
        console.error(`Error Name: ${error.name}`)
        console.error(`Error Message: ${error.message}`)
        if (error.stack) {
          console.error(`Error Stack: ${error.stack}`)
        }
        await sleep(5000)
      }
    }
  }
}

const timeoutCallback: TimeoutCallback = async (retry: RetryFunction) => {
  console.log('Timeout callback called, writing insert queue to S3.')
  continueInserting = false
  let continueWaiting = 5
  while (!safeToWriteQueue && continueWaiting) {
    console.log('Waiting for safeToWriteQueue to be true')
    await sleep(20)
    continueWaiting -= 1
  }

  const bucket = getBucket()
  if (insertQueueFilename) {
    await putJsonFile(bucket, insertQueueFilename, insertQueue)
  } else {
    throw Error(
      'Could not write updated insert queue to S3 because the insertQueueFilename was not set.'
    )
  }
  retry(0)
}

export const handler = jobLambda(episodeInsert, timeoutCallback)
