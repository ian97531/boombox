import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import { FILE_DESIGNATIONS } from '../../constants'
import {
  IEpisodeInsertMessage,
  IEpisodeTranscribePendingMessage,
  IJobInput,
} from '../../types/jobs'
import { NextFunction, RetryFunction } from '../../types/lambdas'
import { buildFilename, checkFileExists, getJsonFile, putJsonFile } from '../../utils/aws/s3'
import { getBucket } from '../../utils/environment'
import { jobLambda } from '../../utils/job'
import { replaceSpeakers } from '../../utils/normalized/replaceSpeakers'

const episodeTranscribePending = async (
  input: IJobInput<IEpisodeTranscribePendingMessage>,
  next: NextFunction<IEpisodeInsertMessage>,
  retry: RetryFunction
) => {
  const bucket = getBucket()
  const awsFile = input.message.aws.transcriptionFile
  const watsonFile = input.message.watson.transcriptionFile
  const awsComplete = await checkFileExists(bucket, awsFile)
  const watsonComplete = await checkFileExists(bucket, watsonFile)

  if (awsComplete && watsonComplete) {
    const awsTranscription = (await getJsonFile(bucket, awsFile)) as ITranscript
    const watsonTranscription = (await getJsonFile(bucket, watsonFile)) as ITranscript
    const finalTranscription = replaceSpeakers(awsTranscription, watsonTranscription)
    const insertQueueFile = buildFilename(
      input.episode,
      FILE_DESIGNATIONS.COMBINED_TRANSCRIPTION_INSERT_QUEUE,
      { suffix: 'json' }
    )
    await putJsonFile(bucket, input.message.final.transcriptionFile, finalTranscription)
    await putJsonFile(bucket, insertQueueFile, finalTranscription)
    next({
      insertQueueFile,
      transcriptionFile: input.message.final.transcriptionFile,
    })
  } else {
    retry(60)
  }
}

export const handler = jobLambda(episodeTranscribePending)
