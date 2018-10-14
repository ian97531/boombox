import { checkFileExists, putJsonFile } from '../../utils/aws/s3'
import {
  checkTranscriptionJobComplete as checkAWSTranscriptionJobComplete,
  getTranscription as getAWSTranscription,
  saveTranscriptionToS3 as saveAWSTranscriptionToS3,
} from '../../utils/aws/transcribe'
import { ENV, episodeCaller, episodeHandler, EpisodeJob } from '../../utils/episode'
import { Job } from '../../utils/job'
import { Lambda } from '../../utils/lambda'
import { appendAllTranscriptions, combineTranscriptions } from '../../utils/normalized'
import {
  checkTranscriptionJobComplete as checkWatsonTranscriptionJobComplete,
  getTranscription as getWatsonTranscription,
  saveTranscriptionToS3 as saveWatsonTranscriptionToS3,
} from '../../utils/watson/transcribe'
import { episodeInsert } from './g-episode-insert'

const episodeTranscribeCompleteHandler = async (lambda: Lambda, job: Job, episode: EpisodeJob) => {
  const numTranscriptions = episode.segments.length
  let completeAwsTranscriptions = 0
  let completeWatsonTranscription = 0
  for (const segment of episode.segments) {
    const awsJobName = segment.transcription.aws.jobName
    const awsFilename = segment.transcription.aws.filename
    const watsonJobName = segment.transcription.watson.jobName
    const watsonFilename = segment.transcription.watson.filename
    if (await checkFileExists(episode.bucket, awsFilename)) {
      completeAwsTranscriptions += 1
    } else if (awsJobName && (await checkAWSTranscriptionJobComplete(awsJobName))) {
      await job.log(`Saving ${awsFilename} to ${episode.bucket}.`)
      await saveAWSTranscriptionToS3(awsJobName, episode.bucket, awsFilename)
      completeAwsTranscriptions += 1
    }

    if (await checkFileExists(episode.bucket, watsonFilename)) {
      completeWatsonTranscription += 1
    } else if (watsonJobName && (await checkWatsonTranscriptionJobComplete(watsonJobName))) {
      await job.log(`Saving ${watsonFilename} to ${episode.bucket}.`)
      await saveWatsonTranscriptionToS3(watsonJobName, episode.bucket, watsonFilename)
      completeWatsonTranscription += 1
    }
  }

  await job.log(
    `${completeAwsTranscriptions} of ${numTranscriptions} AWS transcription jobs are complete.`
  )
  await job.log(
    `${completeWatsonTranscription} of ${numTranscriptions} Watson transcription jobs are complete.`
  )

  const awsComplete = completeAwsTranscriptions === numTranscriptions
  const watsonComplete = completeWatsonTranscription === numTranscriptions

  if (awsComplete && watsonComplete) {
    const awsTranscriptions = []
    const watsonTranscriptions = []

    await job.log(`Fetching ${numTranscriptions} transcriptions from S3...`)
    for (const segment of episode.segments) {
      const awsFilename = segment.transcription.aws.filename
      const watsonFilename = segment.transcription.watson.filename
      awsTranscriptions.push(await getAWSTranscription(episode.bucket, awsFilename))
      watsonTranscriptions.push(await getWatsonTranscription(episode.bucket, watsonFilename))
    }

    await job.log(`Zipping ${numTranscriptions} segments into a single transcription.`)
    const awsTranscription = appendAllTranscriptions(awsTranscriptions)
    const watsonTranscription = appendAllTranscriptions(watsonTranscriptions)
    await putJsonFile(episode.bucket, episode.transcriptions.aws, awsTranscription)
    await putJsonFile(episode.bucket, episode.transcriptions.watson, watsonTranscription)

    await job.log('Enhancing the transcription.')
    const finalTranscription = combineTranscriptions(awsTranscription, watsonTranscription)
    await putJsonFile(episode.bucket, episode.transcriptions.final, finalTranscription)
    await putJsonFile(episode.bucket, episode.transcriptions.insertQueue, finalTranscription)

    episodeInsert(lambda, job, episode)
  } else {
    episodeTranscribeComplete(lambda, job, episode, 120)
  }
}

export const episodeTranscribeComplete = episodeCaller(ENV.EPISODE_TRANSCRIBE_COMPLETE_QUEUE)
export const handler = episodeHandler(episodeTranscribeCompleteHandler)
