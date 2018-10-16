import { IAWSTranscription } from '@boombox/shared/src/types/aws'
import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import { checkFileExists, getJsonFile, putJsonFile } from '@boombox/shared/src/utils/aws/s3'
import {
  AWS_TRANSCRIBE_STATUS,
  createTranscriptionJob,
  deleteTranscriptionJob,
  getTranscriptionJob,
} from '@boombox/shared/src/utils/aws/transcribe'
import Axios from 'axios'
import { EpisodeJob, ISegment } from '../../episode'
import { AWSTranscription } from './AWSTranscription'

const axios = Axios.create()

const createJobName = (inputFilename: string): string => {
  return inputFilename.replace(/[\/\.]/gi, '__')
}

export const transcriptionsReadyToBeNormalized = async (episode: EpisodeJob): Promise<number> => {
  let transcriptionsReady = 0
  let erroredJobs = 0
  const bucket = episode.transcriptionsBucket
  for (const segment of episode.segments) {
    if (await checkFileExists(bucket, segment.transcription.aws.normalizedFilename)) {
      transcriptionsReady += 1
    } else {
      const jobName = createJobName(segment.audio.filename)
      try {
        const response = await getTranscriptionJob(jobName)
        if (
          response.Transcript &&
          response.TranscriptionJobStatus === AWS_TRANSCRIBE_STATUS.SUCCESS
        ) {
          transcriptionsReady += 1
        } else if (response && response.TranscriptionJobStatus === AWS_TRANSCRIBE_STATUS.ERROR) {
          await deleteTranscriptionJob(jobName)
          erroredJobs += 1
        }
      } catch (error) {
        console.log(`No transcription job found for ${jobName}`)
      }
    }
  }
  if (erroredJobs) {
    throw Error(`${erroredJobs} segment transcription job(s) encountered an error.`)
  }

  return transcriptionsReady
}

export const transcribeSegment = async (episode: EpisodeJob, segment: ISegment): Promise<void> => {
  const jobName = createJobName(segment.audio.filename)
  await createTranscriptionJob(episode.segmentsBucket, segment.audio.filename, jobName)
}

export const getEpisodeTranscriptions = async (episode: EpisodeJob): Promise<ITranscript[]> => {
  const transcriptions: ITranscript[] = []
  const bucket = episode.transcriptionsBucket

  for (const segment of episode.segments) {
    const filename = segment.transcription.aws.normalizedFilename
    const rawFilename = segment.transcription.aws.rawFilename
    let transcription: ITranscript | undefined

    if (!(await checkFileExists(bucket, filename))) {
      const jobName = createJobName(segment.audio.filename)
      const response = await getTranscriptionJob(jobName)
      if (
        response.Transcript &&
        response.TranscriptionJobStatus === AWS_TRANSCRIBE_STATUS.SUCCESS
      ) {
        const url = response.Transcript.TranscriptFileUri
        const transcriptResponse = await axios({
          method: 'get',
          responseType: 'json',
          url,
        })
        const rawTranscription = (transcriptResponse.data as IAWSTranscription).results
        await putJsonFile(bucket, rawFilename, rawTranscription)

        const awsTranscription = new AWSTranscription(rawTranscription, segment.audio.startTime)
        transcription = awsTranscription.getNormalizedTranscription()
        await putJsonFile(bucket, filename, transcription)
      } else {
        throw Error(`Cannot get transcription for job: ${jobName}`)
      }
    } else {
      transcription = (await getJsonFile(bucket, filename)) as ITranscript
    }

    transcriptions.push(transcription)
  }

  return transcriptions
}

export const getUntranscribedSegments = async (episode: EpisodeJob): Promise<ISegment[]> => {
  const untranscribedSegments: ISegment[] = []

  for (const segment of episode.segments) {
    const fileExists = await checkFileExists(
      episode.transcriptionsBucket,
      segment.transcription.aws.normalizedFilename
    )

    let transcriptionExists = false
    try {
      const jobName = createJobName(segment.audio.filename)
      const job = await getTranscriptionJob(jobName)
      if (job.TranscriptionJobStatus === AWS_TRANSCRIBE_STATUS.ERROR) {
        await deleteTranscriptionJob(jobName)
        transcriptionExists = false
      } else {
        transcriptionExists = true
      }
    } catch (error) {
      transcriptionExists = false
    }

    if (!fileExists && !transcriptionExists) {
      untranscribedSegments.push(segment)
    }
  }
  return untranscribedSegments
}
