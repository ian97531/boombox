import { checkFileExists } from '../../utils/aws/s3'
import { createTranscriptionJob as createAWSTranscriptionJob } from '../../utils/aws/transcribe'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { sleep } from '../../utils/timing'
import { createTranscriptionJob as createWatsonTranscriptionJob } from '../../utils/watson/transcribe'
import { episodeTranscribeComplete } from './f-episode-transcribe-complete'

const transcribeSegmentsWithAws = async (job: Job, episode: EpisodeJob): Promise<number> => {
  const region = Lambda.getEnvVariable(ENV.AWS_REGION) as string
  let jobsStarted = 0
  for (const segment of episode.segments) {
    const exists = await checkFileExists(episode.bucket, segment.transcription.aws.filename)

    if (!exists) {
      const response = await createAWSTranscriptionJob(
        region,
        episode.bucket,
        segment.audio.filename
      )
      segment.transcription.aws.jobName = response.jobName
      if (response.jobStarted) {
        jobsStarted += 1
        await job.log(`Started an aws transcription job for ${segment.audio.filename}`)
      }
      await sleep(2000)
    } else {
      await job.log(`Transcription file ${segment.transcription.aws.filename} already exists.`)
    }
  }
  return jobsStarted
}

const transcribeSegmentsWithWatson = async (job: Job, episode: EpisodeJob): Promise<number> => {
  let jobsStarted = 0
  for (const segment of episode.segments) {
    const exists = await checkFileExists(episode.bucket, segment.transcription.watson.filename)
    if (!exists) {
      const jobName = await createWatsonTranscriptionJob(episode.bucket, segment.audio.filename)
      segment.transcription.watson.jobName = jobName
      jobsStarted += 1
      await job.log(`Started a watson transcription job for ${segment.audio.filename}`)
      await sleep(2000)
    } else {
      await job.log(`Transcription file ${segment.transcription.watson.filename} already exists.`)
    }
  }
  return jobsStarted
}

const episodeTranscribeStartHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  try {
    const awsJobs = await transcribeSegmentsWithAws(job, episode)
    await job.log(`Started ${awsJobs} of ${episode.segments.length} AWS transcription jobs`)

    const watsonJobs = await transcribeSegmentsWithWatson(job, episode)
    await job.log(`Started ${watsonJobs} of ${episode.segments.length} Watson transcription jobs`)

    const delay = awsJobs || watsonJobs ? 120 : 0
    episodeTranscribeComplete(lambda, job, episode, delay)
  } catch (error) {
    if (error.name === 'ThrottlingException') {
      await job.log('The AWS is throttling our transcription requests. Retrying in 2 minutes.')
      episodeTranscribeStart(lambda, job, episode, 120)
    } else {
      throw error
    }
  }
}

export const episodeTranscribeStart = episodeCaller(ENV.EPISODE_TRANSCRIBE_START_QUEUE)
export const handler = episodeHandler(episodeTranscribeStartHandler)
