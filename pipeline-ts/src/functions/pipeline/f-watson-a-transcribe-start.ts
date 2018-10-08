import { IJobRequest } from '@boombox/shared/src/types/models/job'
import {
  IEpisodeTranscription,
  IWatsonTranscribePendingMessage,
  IWatsonTranscribeStartMessage,
} from '../../types/jobMessages'
import { ILambdaRequest } from '../../types/lambda'
import { jobHandler } from '../../utils/jobHandler'
import { createTranscriptionJob } from '../../utils/watson/transcribe'

const watsonTranscribeStart = async (
  lambda: ILambdaRequest<IWatsonTranscribeStartMessage, IWatsonTranscribePendingMessage>,
  job: IJobRequest
) => {
  const transcriptionRequest = lambda.input
  const transcriptionJob: IEpisodeTranscription = {
    segments: [],
    transcriptionFile: transcriptionRequest.transcriptionFile,
  }

  for (const segment of transcriptionRequest.segments) {
    const segmentTranscriptionJob = await createTranscriptionJob(job.episode, segment)
    transcriptionJob.segments.push(segmentTranscriptionJob)

    await job.log(`Transcription job started for ${segmentTranscriptionJob.jobName}.`)
  }

  lambda.nextFunction(transcriptionJob, 60)
}

export const handler = jobHandler(watsonTranscribeStart)
