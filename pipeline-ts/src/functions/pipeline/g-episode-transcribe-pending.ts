import { IJobRequest } from '@boombox/shared/src/types/models/job'
import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import { IEpisodeInsertMessage, IEpisodeTranscribePendingMessage } from '../../types/jobMessages'
import { ENV, ILambdaRequest } from '../../types/lambda'
import {
  buildFilename,
  checkFileExists,
  FILE_DESIGNATIONS,
  getJsonFile,
  putJsonFile,
} from '../../utils/aws/s3'
import { jobHandler } from '../../utils/jobHandler'
import { replaceSpeakers } from '../../utils/normalized/replaceSpeakers'

const episodeTranscribePending = async (
  lambda: ILambdaRequest<IEpisodeTranscribePendingMessage, IEpisodeInsertMessage>,
  job: IJobRequest
) => {
  const completeTranscriptions = lambda.input
  const bucket = lambda.getEnvVariable(ENV.BUCKET) as string
  const awsFile = completeTranscriptions.aws.transcriptionFile
  const watsonFile = completeTranscriptions.watson.transcriptionFile
  const awsComplete = await checkFileExists(bucket, awsFile)
  const watsonComplete = await checkFileExists(bucket, watsonFile)

  if (awsComplete && watsonComplete) {
    const awsTranscription = (await getJsonFile(bucket, awsFile)) as ITranscript
    const watsonTranscription = (await getJsonFile(bucket, watsonFile)) as ITranscript
    const finalTranscription = replaceSpeakers(awsTranscription, watsonTranscription)
    const insertQueueFile = buildFilename(
      job.episode,
      FILE_DESIGNATIONS.COMBINED_TRANSCRIPTION_INSERT_QUEUE,
      { suffix: 'json' }
    )
    await putJsonFile(bucket, completeTranscriptions.final.transcriptionFile, finalTranscription)
    await putJsonFile(bucket, insertQueueFile, finalTranscription)
    lambda.nextFunction({
      insertQueueFile,
      transcriptionFile: completeTranscriptions.final.transcriptionFile,
    })
  } else {
    lambda.retryFunction(60)
  }
}

export const handler = jobHandler(episodeTranscribePending)
