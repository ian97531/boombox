import { FILE_DESIGNATIONS } from '../../constants'
import {
  IAWSTranscribeStartMessage,
  IEpisodeTranscribePendingMessage,
  IEpisodeTranscribeStartMessage,
  IJobInput,
  IJobMessage,
  IWatsonTranscribeStartMessage,
} from '../../types/jobs'
import { NextFunction } from '../../types/lambdas'
import { sendSQSMessage } from '../../utils/aws/lambda'
import { buildFilename, checkFileExists } from '../../utils/aws/s3'
import { getAwsTranscribeQueue, getBucket, getWatsonTranscribeQueue } from '../../utils/environment'
import { createJobMessage, jobLambda } from '../../utils/job'

const episodeTranscribeStart = async (
  input: IJobInput<IEpisodeTranscribeStartMessage>,
  next: NextFunction<IEpisodeTranscribePendingMessage>
) => {
  const awsQueue = getAwsTranscribeQueue()
  const watsonQueue = getWatsonTranscribeQueue()
  const bucket = getBucket()
  const output = {
    aws: {
      transcriptionFile: buildFilename(
        input.episode,
        FILE_DESIGNATIONS.AWS_NORMALIZED_TRANSCRIPTION_FULL,
        { suffix: 'json' }
      ),
    },
    final: {
      transcriptionFile: buildFilename(
        input.episode,
        FILE_DESIGNATIONS.COMBINED_TRANSCRIPTION_FULL,
        { suffix: 'json' }
      ),
    },
    watson: {
      transcriptionFile: buildFilename(
        input.episode,
        FILE_DESIGNATIONS.WATSON_NORMALIZED_TRANSCRIPTION_FULL,
        { suffix: 'json' }
      ),
    },
  }

  if (!(await checkFileExists(bucket, output.aws.transcriptionFile))) {
    const awsMessage: IJobMessage<IAWSTranscribeStartMessage> = createJobMessage(input.job, {
      segments: input.message,
      transcriptionFile: output.aws.transcriptionFile,
    })

    await sendSQSMessage(awsMessage, awsQueue)
  }

  if (!(await checkFileExists(bucket, output.watson.transcriptionFile))) {
    const watsonMessage: IJobMessage<IWatsonTranscribeStartMessage> = createJobMessage(input.job, {
      segments: input.message,
      transcriptionFile: output.watson.transcriptionFile,
    })

    await sendSQSMessage(watsonMessage, watsonQueue)
  }

  next(output, 120)
}

export const handler = jobLambda(episodeTranscribeStart)
