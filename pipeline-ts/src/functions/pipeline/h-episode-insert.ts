import { putIStatmentDBRecord } from '@boombox/shared/src/db/statements'
import { IJobRequest } from '@boombox/shared/src/types/models/job'
import {
  IStatementDBRecord,
  ITranscript,
  ITranscriptWord,
} from '@boombox/shared/src/types/models/transcript'
import { IEpisodeInsertMessage } from '../../types/jobMessages'
import { ENV, ILambdaRequest } from '../../types/lambda'
import { checkFileExists, getJsonFile, putJsonFile } from '../../utils/aws/s3'
import { jobHandler } from '../../utils/jobHandler'

const sleep = async (milliseconds: number) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const episodeInsert = async (
  lambda: ILambdaRequest<IEpisodeInsertMessage, void>,
  job: IJobRequest
) => {
  const functionStartTime = Date.now()
  const bucket = lambda.getEnvVariable(ENV.BUCKET) as string
  const writeCapacityUnits = lambda.getEnvVariable(ENV.STATEMENTS_TABLE_WCU) as number
  const insertQueueFilename = lambda.input.insertQueueFile
  let consumedWriteCapacity = 0
  let continueInserting = true
  let safeToWriteQueue = true
  let insertQueue: ITranscript

  lambda.onTimeout(async () => {
    await job.log('Timeout callback called, writing insert queue to S3.')
    continueInserting = false
    let continueWaiting = 5
    while (!safeToWriteQueue && continueWaiting) {
      await job.log('Waiting for safeToWriteQueue to be true')
      await sleep(20)
      continueWaiting -= 1
    }

    if (insertQueueFilename) {
      if (insertQueue && insertQueue.length) {
        await putJsonFile(bucket, insertQueueFilename, insertQueue)
      } else {
        await job.log('Skipping writing insert queue because it appears to be empty.')
      }
    } else {
      throw Error(
        'Could not write updated insert queue to S3 because the insertQueueFilename was not set.'
      )
    }
    lambda.retryFunction(0)
  })

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
        const putReponse = await putIStatmentDBRecord(record)
        if (putReponse.ConsumedCapacity && putReponse.ConsumedCapacity.CapacityUnits) {
          consumedWriteCapacity += putReponse.ConsumedCapacity.CapacityUnits
          const currentTime = Date.now()
          const seconds = (currentTime - functionStartTime) / 1000
          const availableWriteCapacity = seconds * writeCapacityUnits
          if (consumedWriteCapacity > availableWriteCapacity) {
            await sleep(1000)
          }
        }
      } catch (error) {
        let errorMessage =
          'Looks like we threw and exception because we exceeded our write capacity.\n'
        errorMessage += `Error Name: ${error.name}\n`
        errorMessage += `Error Message: ${error.message}\n`
        if (error.stack) {
          errorMessage += `Error Stack: ${error.stack}`
        }
        await job.log(errorMessage)
        await sleep(5000)
      }
    }
  }
}

export const handler = jobHandler(episodeInsert)
