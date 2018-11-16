import { aws, db, IStatementDBRecord, ITranscript, ITranscriptWord, utils } from '@boombox/shared'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'

const episodeInsertHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  const insertQueueFilename = episode.transcriptions.insertQueue
  // let continueInserting = true
  // let safeToWriteQueue = true
  let insertQueue: ITranscript

  if (await aws.s3.checkFileExists(episode.bucket, insertQueueFilename)) {
    insertQueue = (await aws.s3.getJsonFile(episode.bucket, insertQueueFilename)) as ITranscript
    await job.log(`Starting to insert ${insertQueue.length} items into dynamo as statements.`)
    let word = insertQueue.shift() as ITranscriptWord
    let timedOut = false
    episode.totalStatements = 0
    while (insertQueue.length && !timedOut) {
      let endTime = word.endTime
      const startTime = utils.numbers.round(word.startTime, 3)
      const currentSpeaker = word.speaker
      const words: ITranscriptWord[] = []
      while (word && currentSpeaker === word.speaker) {
        words.push({
          confidence: utils.numbers.round(word.confidence, 3),
          content: word.content,
          endTime: utils.numbers.round(word.endTime, 3),
          speaker: word.speaker,
          startTime: utils.numbers.round(word.startTime, 3),
        })
        endTime = utils.numbers.round(word.endTime, 3)
        word = insertQueue.shift() as ITranscriptWord
      }
      const record: IStatementDBRecord = {
        endTime,
        speaker: currentSpeaker,
        startTime,
        words,
      }
      await db.statements.putIStatmentDBRecord(episode.getEpisode(), record)
      episode.totalStatements += 1
      if (episode.totalStatements % 25 === 0) {
        await job.log(`${episode.totalStatements} statements inserted.`)
      }
      timedOut = lambda.getRemainingTimeInMillis() < 10000
    }

    if (insertQueue.length === 0) {
      await job.log(`Inserted ${episode.totalStatements} statements.`)
      await db.episodes.putEpisode(episode.getEpisode())
      await aws.s3.deleteFile(episode.bucket, episode.transcriptions.insertQueue)
      await job.log('Added the episode record to dynamodb.')
      await job.completeWithSuccess()
    } else {
      await job.log(`Writing remaining ${insertQueue.length} insert queue items to S3.`)
      await aws.s3.putJsonFile(episode.bucket, insertQueueFilename, insertQueue)
      episodeInsert(lambda, job, episode)
    }
  } else {
    await job.log('No insert queue was found.')
  }
}

export const episodeInsert = episodeCaller(ENV.EPISODE_INSERT_QUEUE)
export const handler = episodeHandler(episodeInsertHandler)
