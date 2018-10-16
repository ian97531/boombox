import { ITranscript } from '@boombox/shared/src/types/models/transcript'
import { checkFileExists, getJsonFile, putJsonFile } from '@boombox/shared/src/utils/aws/s3'
import {
  createTranscriptionJob,
  getTranscriptionJob,
  WATSON_TRANSCRIBE_STATUS,
} from '@boombox/shared/src/utils/watson/transcribe'
import { SpeechRecognitionResults } from 'watson-developer-cloud/speech-to-text/v1-generated'
import { EpisodeJob, ISegment } from '../../episode'
import { WatsonTranscription } from './WatsonTranscription'

export const transcriptionsReadyToBeNormalized = async (episode: EpisodeJob): Promise<number> => {
  let transcriptionsReady = 0
  let erroredJobs = 0
  const bucket = episode.transcriptionsBucket
  for (const segment of episode.segments) {
    if (await checkFileExists(bucket, segment.transcription.watson.filename)) {
      transcriptionsReady += 1
    } else {
      if (segment.transcription.watson.jobName) {
        const jobName = segment.transcription.watson.jobName
        try {
          const response = await getTranscriptionJob(jobName)
          if (
            response.results &&
            response.results[0] &&
            response.results[0].results &&
            response.status === WATSON_TRANSCRIBE_STATUS.SUCCESS
          ) {
            transcriptionsReady += 1
          } else if (response.status === WATSON_TRANSCRIBE_STATUS.SUCCESS) {
            erroredJobs += 1
          } else if (response.status === WATSON_TRANSCRIBE_STATUS.ERROR) {
            erroredJobs += 1
          }
        } catch (error) {
          console.log(`No transcription job found for ${jobName}`)
        }
      }
    }
  }
  if (erroredJobs) {
    throw Error(`${erroredJobs} segment transcription job(s) encountered an error.`)
  }

  return transcriptionsReady
}

export const transcribeSegment = async (episode: EpisodeJob, segment: ISegment): Promise<void> => {
  const jobName = await createTranscriptionJob(episode.segmentsBucket, segment.audio.filename)
  segment.transcription.watson.jobName = jobName
}

export const getEpisodeTranscriptions = async (episode: EpisodeJob): Promise<ITranscript[]> => {
  const transcriptions: ITranscript[] = []
  const bucket = episode.transcriptionsBucket

  for (const segment of episode.segments) {
    const filename = segment.transcription.watson.filename
    let rawTranscription: SpeechRecognitionResults | undefined

    if (!(await checkFileExists(bucket, filename))) {
      if (segment.transcription.watson.jobName) {
        const jobName = segment.transcription.watson.jobName
        const job = await getTranscriptionJob(jobName)
        if (
          job.results &&
          job.results[0] &&
          job.results[0].results &&
          job.status === WATSON_TRANSCRIBE_STATUS.SUCCESS
        ) {
          rawTranscription = job.results[0]
          await putJsonFile(bucket, filename, rawTranscription)
        }
      }
    } else {
      rawTranscription = (await getJsonFile(bucket, filename)) as SpeechRecognitionResults
    }

    if (!rawTranscription) {
      throw Error(`Cannot get transcription for segment: ${segment.audio.filename}`)
    }

    const transcription = new WatsonTranscription(rawTranscription, segment.audio.startTime)
    transcriptions.push(transcription.getNormalizedTranscription())
  }

  return transcriptions
}

export const getUntranscribedSegments = async (episode: EpisodeJob): Promise<ISegment[]> => {
  const untranscribedSegments: ISegment[] = []

  for (const segment of episode.segments) {
    const fileExists = await checkFileExists(
      episode.transcriptionsBucket,
      segment.transcription.watson.filename
    )
    let transcriptionExists = false
    if (segment.transcription.watson.jobName) {
      try {
        const job = await getTranscriptionJob(segment.transcription.watson.jobName)
        if (job.status === WATSON_TRANSCRIBE_STATUS.ERROR) {
          transcriptionExists = false
        } else if (job.results && !job.results[0].results) {
          transcriptionExists = false
        } else {
          transcriptionExists = true
        }
      } catch (error) {
        transcriptionExists = false
      }
    } else {
      transcriptionExists = false
    }

    if (!fileExists && !transcriptionExists) {
      untranscribedSegments.push(segment)
    }
  }
  return untranscribedSegments
}
