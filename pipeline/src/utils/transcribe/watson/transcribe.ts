import { aws, ITranscript, watson, WATSON_TRANSCRIBE_STATUS } from '@boombox/shared'
import { EpisodeJob, ISegment } from '../../episode'
import { WatsonTranscription } from './WatsonTranscription'

export const transcriptionsReadyToBeNormalized = async (episode: EpisodeJob): Promise<number> => {
  let transcriptionsReady = 0
  let erroredJobs = 0
  const bucket = episode.transcriptionsBucket
  for (const segment of episode.segments) {
    if (await aws.s3.checkFileExists(bucket, segment.transcription.watson.normalizedFilename)) {
      transcriptionsReady += 1
    } else {
      if (segment.transcription.watson.jobName) {
        const jobName = segment.transcription.watson.jobName
        try {
          const response = await watson.transcribe.getTranscriptionJob(jobName)
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
  const jobName = await watson.transcribe.createTranscriptionJob(
    episode.segmentsBucket,
    segment.audio.filename
  )
  segment.transcription.watson.jobName = jobName
}

export const getEpisodeTranscriptions = async (episode: EpisodeJob): Promise<ITranscript[]> => {
  const transcriptions: ITranscript[] = []
  const bucket = episode.transcriptionsBucket

  for (const segment of episode.segments) {
    const filename = segment.transcription.watson.normalizedFilename
    const rawFilename = segment.transcription.watson.rawFilename
    let transcription: ITranscript | undefined

    if (!(await aws.s3.checkFileExists(bucket, filename))) {
      if (segment.transcription.watson.jobName) {
        const jobName = segment.transcription.watson.jobName
        const job = await watson.transcribe.getTranscriptionJob(jobName)
        if (
          job.results &&
          job.results[0] &&
          job.results[0].results &&
          job.status === WATSON_TRANSCRIBE_STATUS.SUCCESS
        ) {
          const rawTranscription = job.results[0]
          await aws.s3.putJsonFile(bucket, rawFilename, rawTranscription)

          const watsonTranscription = new WatsonTranscription(
            rawTranscription,
            segment.audio.startTime
          )
          transcription = watsonTranscription.getNormalizedTranscription()
          await aws.s3.putJsonFile(bucket, filename, transcription)
        }
      }
    } else {
      transcription = (await aws.s3.getJsonFile(bucket, filename)) as ITranscript
    }

    if (!transcription) {
      throw Error(`Cannot get transcription for segment: ${segment.audio.filename}`)
    }

    transcriptions.push(transcription)
  }

  return transcriptions
}

export const getUntranscribedSegments = async (episode: EpisodeJob): Promise<ISegment[]> => {
  const untranscribedSegments: ISegment[] = []

  for (const segment of episode.segments) {
    const fileExists = await aws.s3.checkFileExists(
      episode.transcriptionsBucket,
      segment.transcription.watson.normalizedFilename
    )
    let transcriptionExists = false
    if (segment.transcription.watson.jobName) {
      try {
        const job = await watson.transcribe.getTranscriptionJob(
          segment.transcription.watson.jobName
        )
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
