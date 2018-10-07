import {
  IAWSTranscribePendingMessage,
  IAWSTranscribeStartMessage,
  IEpisodeTranscription,
  IJobInput,
} from '../../types/jobs'
import { NextFunction } from '../../types/lambdas'
import { createTranscriptionJob } from '../../utils/aws/transcribe'
import { jobLambda } from '../../utils/job'
import { logStatus } from '../../utils/status'

const awsTranscribeStart = async (
  input: IJobInput<IAWSTranscribeStartMessage>,
  next: NextFunction<IAWSTranscribePendingMessage>
) => {
  const transcriptions: IEpisodeTranscription = {
    segments: [],
    transcriptionFile: input.message.transcriptionFile,
  }

  for (const segment of input.message.segments) {
    const job = await createTranscriptionJob(input.episode, segment)
    transcriptions.segments.push(job)

    logStatus(`Transcription job started for ${job.transcriptionJob}.`)
  }

  next(transcriptions, 60)
}

export const handler = jobLambda(awsTranscribeStart)
