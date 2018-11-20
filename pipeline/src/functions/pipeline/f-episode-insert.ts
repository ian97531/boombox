import { aws, db, IStatementDBRecord } from '@boombox/shared'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'

const episodeInsertHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  const insertQueueFilename = episode.transcriptions.insertQueue

  if (await aws.s3.checkFileExists(episode.bucket, insertQueueFilename)) {
    const insertQueue = (await aws.s3.getJsonFile(
      episode.bucket,
      insertQueueFilename
    )) as IStatementDBRecord[]
    await job.log(`Starting to insert ${insertQueue.length} items into dynamo as statements.`)

    let timedOut = false
    episode.totalStatements = 0
    while (insertQueue.length && !timedOut) {
      const record = insertQueue.shift()
      if (record) {
        await db.statements.putIStatmentDBRecord(episode.getEpisode(), record)
        episode.totalStatements += 1
        if (episode.totalStatements % 25 === 0) {
          await job.log(`${episode.totalStatements} statements inserted.`)
        }
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
