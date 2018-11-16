import { Job, jobCaller, jobHandler } from 'utils/job'
import { Lambda } from 'utils/lambda'
import { EpisodeJob, ISerializedEpisodeJob } from './EpisodeJob'

const episodeHandlerFunction = (
  func: (request: Lambda, job: Job, episode: EpisodeJob) => Promise<void>
) => {
  return async (lambda: Lambda, job: Job, message: ISerializedEpisodeJob) => {
    const episode = new EpisodeJob(message)
    try {
      await func(lambda, job, episode)
    } catch (error) {
      await episode.completeWithError()
      throw error
    }
  }
}

export const episodeHandler = (
  func: (request: Lambda, job: Job, episode: EpisodeJob) => Promise<void>
) => {
  return jobHandler(episodeHandlerFunction(func))
}

export const episodeCaller = (queueName: string) => {
  return (lambda: Lambda, job: Job, episode: EpisodeJob, delay: number = 0) => {
    const serialized = episode.serialize()
    jobCaller(queueName)(lambda, job, serialized, delay)
  }
}
