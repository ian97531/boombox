import { IJobRequest } from '@boombox/shared/src/types/models/job'
import {
  IAWSTranscribePendingMessage,
  IAWSTranscribeStartMessage,
  IEpisodeTranscription,
} from '../../types/jobMessages'
import { ILambdaRequest } from '../../types/lambda'
import { createTranscriptionJob } from '../../utils/aws/transcribe'
import { jobHandler } from '../../utils/jobHandler'

const awsTranscribeStart = async (
  lambda: ILambdaRequest<IAWSTranscribeStartMessage, IAWSTranscribePendingMessage>,
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

export const handler = jobHandler(awsTranscribeStart)
