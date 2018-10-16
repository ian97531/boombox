import {
  IAWSTranscription,
  IAWSTranscriptionItem,
  IAWSTranscriptionResult,
  IAWSTranscriptionSpeakerLabelSegment,
} from '@boombox/shared/src/types/aws'
import { ITranscript } from '@boombox/shared/src/types/models/transcript'

import { checkFileExists, getJsonFile, putJsonFile } from '@boombox/shared/src/utils/aws/s3'
import {
  AWS_TRANSCRIBE_STATUS,
  createTranscriptionJob,
  deleteTranscriptionJob,
  getTranscriptionJob,
} from '@boombox/shared/src/utils/aws/transcribe'
import { round } from '@boombox/shared/src/utils/numbers'
import Axios from 'axios'
import { EpisodeJob, ISegment } from './EpisodeJob'

const axios = Axios.create()

enum AWS_TRANSCRIPTION {
  PRONUNCIATION = 'pronunciation',
  PUNCTUATION = 'punctuation',
  SPEAKER_0 = 'spk_0',
  SPEAKER_1 = 'spk_1',
}

export class AWSTranscription {
  private speakers: IAWSTranscriptionSpeakerLabelSegment[]
  private items: IAWSTranscriptionItem[]
  private item = 0
  private segment = 0
  private startTime = 0

  constructor(result: IAWSTranscriptionResult, startTime: number = 0) {
    this.speakers = result.speaker_labels.segments
    this.items = result.items
    this.startTime = startTime
  }

  public getNormalizedTranscription(): ITranscript {
    const normalizedTranscription: ITranscript = []

    for (const item of this.items) {
      if (item.type === AWS_TRANSCRIPTION.PRONUNCIATION) {
        const speaker = this.getNextSpeaker()
        normalizedTranscription.push({
          confidence: round(parseFloat(item.alternatives[0].confidence), 3),
          content: item.alternatives[0].content,
          endTime: round(parseFloat(item.end_time) + this.startTime, 3),
          speaker,
          startTime: round(parseFloat(item.start_time) + this.startTime, 3),
        })
      }
    }

    return normalizedTranscription
  }

  private getNextSpeaker() {
    while (this.item >= this.speakers[this.segment].items.length) {
      this.segment += 1
      this.item = 0
    }

    const speaker = this.speakers[this.segment].items[this.item]
    this.item += 1

    return speaker.speaker_label === AWS_TRANSCRIPTION.SPEAKER_0 ? 0 : 1
  }
}

const createJobName = (inputFilename: string): string => {
  return inputFilename.replace(/[\/\.]/gi, '__')
}

export const transcriptionsReadyToBeNormalized = async (episode: EpisodeJob): Promise<number> => {
  let transcriptionsReady = 0
  let erroredJobs = 0
  const bucket = episode.transcriptionsBucket
  for (const segment of episode.segments) {
    if (await checkFileExists(bucket, segment.transcription.aws.filename)) {
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
export const episodeTranscriptionIsComplete = async (episode: EpisodeJob): Promise<boolean> => {
  let transcriptionsComplete = 0
  let erroredJobs = 0
  for (const segment of episode.segments) {
    const jobName = createJobName(segment.audio.filename)
    try {
      const response = await getTranscriptionJob(jobName)
      if (
        response.Transcript &&
        response.TranscriptionJobStatus === AWS_TRANSCRIBE_STATUS.SUCCESS
      ) {
        transcriptionsComplete += 1
      } else if (response.TranscriptionJobStatus === AWS_TRANSCRIBE_STATUS.ERROR) {
        await deleteTranscriptionJob(jobName)
        erroredJobs += 1
      }
    } catch (error) {
      console.log(`No transcription job found for ${jobName}`)
    }
  }
  if (erroredJobs) {
    throw Error(`${erroredJobs} segment transcription job(s) encountered an error.`)
  }

  return transcriptionsComplete === episode.segments.length
}

export const transcribeSegment = async (episode: EpisodeJob, segment: ISegment): Promise<void> => {
  const jobName = createJobName(segment.audio.filename)
  await createTranscriptionJob(episode.segmentsBucket, segment.audio.filename, jobName)
}

export const getEpisodeTranscriptions = async (episode: EpisodeJob): Promise<ITranscript[]> => {
  const transcriptions: ITranscript[] = []
  const bucket = episode.transcriptionsBucket

  for (const segment of episode.segments) {
    const filename = segment.transcription.aws.filename
    let rawTranscription: IAWSTranscriptionResult | undefined

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
        rawTranscription = (transcriptResponse.data as IAWSTranscription).results
        await putJsonFile(bucket, filename, rawTranscription)
      } else {
        throw Error(`Cannot get transcription for job: ${jobName}`)
      }
    } else {
      rawTranscription = (await getJsonFile(bucket, filename)) as IAWSTranscriptionResult
    }

    const transcription = new AWSTranscription(rawTranscription, segment.audio.startTime)
    transcriptions.push(transcription.getNormalizedTranscription())
  }

  return transcriptions
}

export const getUntranscribedSegments = async (episode: EpisodeJob): Promise<ISegment[]> => {
  const untranscribedSegments: ISegment[] = []

  for (const segment of episode.segments) {
    const fileExists = await checkFileExists(
      episode.transcriptionsBucket,
      segment.transcription.aws.filename
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
