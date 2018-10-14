import { putEpisode, putIStatmentDBRecord } from '@boombox/shared/src/db'
import {
  IStatementDBRecord,
  ITranscript,
  ITranscriptWord,
} from '@boombox/shared/src/types/models/transcript'
import { sleep } from '@boombox/shared/src/utils/timing'
import { checkFileExists, deleteFile, getJsonFile, putJsonFile } from '../../utils/aws/s3'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'

const episodeInsertHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  const insertQueueFilename = episode.transcriptions.insertQueue
  let continueInserting = true
  let safeToWriteQueue = true
  let insertQueue: ITranscript

  lambda.addOnTimeoutHanlder(async () => {
    await job.log('Timeout callback called.')
    continueInserting = false
    let continueWaiting = 5
    while (!safeToWriteQueue && continueWaiting) {
      await job.log('Waiting for safeToWriteQueue to be true')
      await sleep(20)
      continueWaiting -= 1
    }

    if (insertQueueFilename) {
      if (insertQueue && insertQueue.length) {
        await job.log(`Writing remaining ${insertQueue.length} insert queue items to S3.`)
        await putJsonFile(episode.bucket, insertQueueFilename, insertQueue)
      } else {
        await job.log('Skipping writing insert queue because it appears to be empty.')
      }
    } else {
      throw Error(
        'Could not write updated insert queue to S3 because the insertQueueFilename was not set.'
      )
    }
    episodeInsert(lambda, job, episode)
  })

  if (await checkFileExists(episode.bucket, insertQueueFilename)) {
    insertQueue = (await getJsonFile(episode.bucket, insertQueueFilename)) as ITranscript
    await job.log(`Starting to insert ${insertQueue.length} items into dynamo as statements.`)
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
      if (episode.totalStatements === undefined) {
        episode.totalStatements = 0
      }
      episode.totalStatements += 1

      try {
        await putIStatmentDBRecord(record)
      } catch (error) {
        await job.logError('Error inserting statement.', error)
        await sleep(5000)
      }
    }

    if (insertQueue.length === 0) {
      await job.log(`Inserted ${episode.totalStatements} statements.`)
      await deleteFile(episode.bucket, episode.transcriptions.insertQueue)
      await putEpisode(episode.getEpisode())
      await job.log('Added the episode record to dynamodb.')
    }
  } else {
    await job.log('No insert queue was found.')
  }
}

export const episodeInsert = episodeCaller(ENV.EPISODE_INSERT_QUEUE)
export const handler = episodeHandler(episodeInsertHandler)
