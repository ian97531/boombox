import {
  IEpisodeTranscription,
  IJobInput,
  IWatsonTranscribePendingMessage,
  IWatsonTranscribeStartMessage,
} from '../../types/jobs'
import { NextFunction } from '../../types/lambdas'
import { jobLambda } from '../../utils/job'
import { logStatus } from '../../utils/status'
import { createTranscriptionJob } from '../../utils/watson/transcribe'

const watsonTranscribeStart = async (
  input: IJobInput<IWatsonTranscribeStartMessage>,
  next: NextFunction<IWatsonTranscribePendingMessage>
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

export const handler = jobLambda(watsonTranscribeStart)
