import { IEpisode } from '@boombox/shared/src/types/models/episode'
import * as AWS from 'aws-sdk'
import { FILE_DESIGNATIONS } from '../constants'
import { IEpisodeSegment, IEpisodeTranscriptionSegment } from '../types/jobs'
import { buildFilename } from '../utils/s3'

const transcribe = new AWS.TranscribeService()

export const createTranscriptionJob = async (
  episode: IEpisode,
  segment: IEpisodeSegment,
  bucket: string
): Promise<IEpisodeTranscriptionSegment> => {
  const jobName = buildFilename(episode, FILE_DESIGNATIONS.AWS_RAW_TRANSCRIPTION_SEGMENT, {
    duration: segment.duration,
    separator: '__',
    startTime: segment.startTime,
  })

  if (checkTranscriptionExists(bucket, jobName)) {
    const params: AWS.TranscribeService.StartTranscriptionJobRequest = {
      LanguageCode: 'en-US',
      Media: {
        MediaFileUri: segment.filename,
      },
      MediaFormat: 'mp3',
      MediaSampleRateHertz: 44100,
      OutputBucketName: bucket,
      Settings: {
        MaxSpeakerLabels: 2,
        ShowSpeakerLabels: true,
      },
      TranscriptionJobName: jobName,
    }
    await transcribe.startTranscriptionJob(params).promise()
  }

  return {
    ...segment,
    transcript: jobName,
  }
}

export const checkTranscriptionExists = async (bucket: string, job: string): Promise<boolean> => {
  return true
}
