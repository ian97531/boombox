import { Job, jobCaller, jobHandler } from '../job'
import { Lambda } from '../lambda'
import { EpisodeJob, ISerializedEpisodeJob } from './EpisodeJob'

const episodeHandlerFunction = (
  func: (request: Lambda, job: Job, episode: EpisodeJob) => Promise<void>
) => {
  return async (lambda: Lambda, job: Job, message: ISerializedEpisodeJob) => {
    const episode = new EpisodeJob(message)
    await func(lambda, job, episode)
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
