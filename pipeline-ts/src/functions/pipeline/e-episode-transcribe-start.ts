import { ENV, FILE_DESIGNATIONS } from '../../constants'
import {
  IAWSTranscribeStartMessage,
  IEpisodeTranscribePendingMessage,
  IEpisodeTranscribeStartMessage,
  IJobInput,
  IJobMessage,
  IWatsonTranscribeStartMessage,
} from '../../types/jobs'
import { NextFunction } from '../../types/lambdas'
import { createJobMessage, jobLambda } from '../../utils/job'
import { sendSQSMessage } from '../../utils/lambda'
import { buildFilename, checkFileExists } from '../../utils/s3'
import { logError } from '../../utils/status'

const episodeTranscribeStart = async (
  input: IJobInput<IEpisodeTranscribeStartMessage>,
  next: NextFunction<IEpisodeTranscribePendingMessage>
) => {
  const awsQueue = process.env[ENV.AWS_TRANSCRIBE_QUEUE]
  const watsonQueue = process.env[ENV.WATSON_TRANSCRIBE_QUEUE]
  const bucket = process.env[ENV.BUCKET]

  if (awsQueue === undefined || watsonQueue === undefined) {
    throw logError('AWS_TRANSCRIBE_QUEUE or WATSON_TRANSCRIBE_QUEUE is not defined.')
  }

  if (bucket === undefined) {
    throw logError('The BUCKET environment variable is not defined.')
  }

  const transcripts = {
    awsTranscript: buildFilename(
      input.episode,
      FILE_DESIGNATIONS.AWS_NORMALIZED_TRANSCRIPTION_FULL
    ),
    watsonTranscript: buildFilename(
      input.episode,
      FILE_DESIGNATIONS.WATSON_NORMALIZED_TRANSCRIPTION_FULL
    ),
  }

  if (!(await checkFileExists(bucket, transcripts.awsTranscript))) {
    const awsMessage: IJobMessage<IAWSTranscribeStartMessage> = createJobMessage(input.job, {
      segments: input.message,
      transcript: transcripts.awsTranscript,
    })

    await sendSQSMessage(awsMessage, awsQueue)
  }

  if (!(await checkFileExists(bucket, transcripts.watsonTranscript))) {
    const watsonMessage: IJobMessage<IWatsonTranscribeStartMessage> = createJobMessage(input.job, {
      segments: input.message,
      transcript: transcripts.watsonTranscript,
    })

    await sendSQSMessage(watsonMessage, watsonQueue)
  }

  next(transcripts)
}

export const handler = jobLambda(episodeTranscribeStart)
