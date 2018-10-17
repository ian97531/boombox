import { putEpisode, putIStatmentDBRecord } from '@boombox/shared/src/db'
import {
  IStatementDBRecord,
  ITranscript,
  ITranscriptWord,
} from '@boombox/shared/src/types/models/transcript'
import {
  checkFileExists,
  deleteFile,
  getJsonFile,
  putJsonFile,
} from '@boombox/shared/src/utils/aws/s3'
import { round } from '@boombox/shared/src/utils/numbers'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'

const episodeInsertHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  const insertQueueFilename = episode.transcriptions.insertQueue
  // let continueInserting = true
  // let safeToWriteQueue = true
  let insertQueue: ITranscript

  if (await checkFileExists(episode.bucket, insertQueueFilename)) {
    insertQueue = (await getJsonFile(episode.bucket, insertQueueFilename)) as ITranscript
    await job.log(`Starting to insert ${insertQueue.length} items into dynamo as statements.`)
    let word = insertQueue.shift() as ITranscriptWord
    let timedOut = false
    episode.totalStatements = 0
    while (insertQueue.length && !timedOut) {
      let endTime = word.endTime
      const startTime = round(word.startTime, 3)
      const currentSpeaker = word.speaker
      const words: ITranscriptWord[] = []
      while (word && currentSpeaker === word.speaker) {
        words.push({
          confidence: round(word.confidence, 3),
          content: word.content,
          endTime: round(word.endTime, 3),
          speaker: word.speaker,
          startTime: round(word.startTime, 3),
        })
        endTime = round(word.endTime, 3)
        word = insertQueue.shift() as ITranscriptWord
      }
      const record: IStatementDBRecord = {
        endTime,
        speaker: currentSpeaker,
        startTime,
        words,
      }
      await putIStatmentDBRecord(episode.getEpisode(), record)
      episode.totalStatements += 1
      if (episode.totalStatements % 25 === 0) {
        await job.log(`${episode.totalStatements} statements inserted.`)
      }
      timedOut = lambda.getRemainingTimeInMillis() < 10000
    }

    if (insertQueue.length === 0) {
      await job.log(`Inserted ${episode.totalStatements} statements.`)
      await putEpisode(episode.getEpisode())
      await deleteFile(episode.bucket, episode.transcriptions.insertQueue)
      await job.log('Added the episode record to dynamodb.')
      await job.completeWithSuccess()
    } else {
      await job.log(`Writing remaining ${insertQueue.length} insert queue items to S3.`)
      await putJsonFile(episode.bucket, insertQueueFilename, insertQueue)
      episodeInsert(lambda, job, episode)
    }
  } else {
    await job.log('No insert queue was found.')
  }
}

export const episodeInsert = episodeCaller(ENV.EPISODE_INSERT_QUEUE)
export const handler = episodeHandler(episodeInsertHandler)
