import { IJobRequest } from '@boombox/shared/src/types/models/job'
import {
  IAWSTranscribeStartMessage,
  IEpisodeTranscribePendingMessage,
  IEpisodeTranscribeStartMessage,
  IWatsonTranscribeStartMessage,
} from '../../types/jobMessages'
import { ENV, ILambdaRequest } from '../../types/lambda'
import { buildFilename, checkFileExists, FILE_DESIGNATIONS } from '../../utils/aws/s3'
import { jobHandler } from '../../utils/jobHandler'

const episodeTranscribeStart = async (
  lambda: ILambdaRequest<IEpisodeTranscribeStartMessage, IEpisodeTranscribePendingMessage>,
  job: IJobRequest
) => {
  const awsQueue = lambda.getEnvVariable(ENV.AWS_TRANSCRIBE_QUEUE) as string
  const watsonQueue = lambda.getEnvVariable(ENV.WATSON_TRANSCRIBE_QUEUE) as string
  const bucket = lambda.getEnvVariable(ENV.BUCKET) as string
  const segments = lambda.input
  const output = {
    aws: {
      transcriptionFile: buildFilename(
        job.episode,
        FILE_DESIGNATIONS.AWS_NORMALIZED_TRANSCRIPTION_FULL,
        { suffix: 'json' }
      ),
    },
    final: {
      transcriptionFile: buildFilename(job.episode, FILE_DESIGNATIONS.COMBINED_TRANSCRIPTION_FULL, {
        suffix: 'json',
      }),
    },
    watson: {
      transcriptionFile: buildFilename(
        job.episode,
        FILE_DESIGNATIONS.WATSON_NORMALIZED_TRANSCRIPTION_FULL,
        { suffix: 'json' }
      ),
    },
  }

  if (!(await checkFileExists(bucket, output.aws.transcriptionFile))) {
    await job.createSubJob<IAWSTranscribeStartMessage>(awsQueue, {
      segments,
      transcriptionFile: output.aws.transcriptionFile,
    })
  }

  if (!(await checkFileExists(bucket, output.watson.transcriptionFile))) {
    await job.createSubJob<IWatsonTranscribeStartMessage>(watsonQueue, {
      segments,
      transcriptionFile: output.watson.transcriptionFile,
    })
  }

  lambda.nextFunction(output, 120)
}

export const handler = jobHandler(episodeTranscribeStart)
