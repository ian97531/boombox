import { ENV } from '../../constants'
import {
  IAWSTranscribePendingMessage,
  IAWSTranscribeStartMessage,
  IEpisodeTranscription,
  IJobInput,
} from '../../types/jobs'
import { NextFunction } from '../../types/lambdas'
import { jobLambda } from '../../utils/job'
import { logError, logStatus } from '../../utils/status'
import { createTranscriptionJob } from '../../utils/transcribe'

const awsTranscribeStart = async (
  input: IJobInput<IAWSTranscribeStartMessage>,
  next: NextFunction<IAWSTranscribePendingMessage>
) => {
  const bucket = process.env[ENV.BUCKET]
  if (bucket === undefined) {
    throw logError('The environment variable BUCKET is not defined.')
  }

  const transcriptions: IEpisodeTranscription = {
    segments: [],
    transcript: input.message.transcript,
  }

  for (const segment of input.message.segments) {
    const job = await createTranscriptionJob(input.episode, segment, bucket)
    transcriptions.segments.push(job)

    logStatus(`Transcription job started for ${job.transcript}.`)
  }

  next(transcriptions)
}

export const handler = jobLambda(awsTranscribeStart)
