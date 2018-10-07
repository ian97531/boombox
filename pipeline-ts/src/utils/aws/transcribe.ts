import { IEpisode } from '@boombox/shared/src/types/models/episode'
import * as AWS from 'aws-sdk'
import Axios from 'axios'
import { AWS_TRANSCRIBE_SUCCESS_STATUS, FILE_DESIGNATIONS } from '../../constants'
import { IAWSTranscription, IAWSTranscriptionResult } from '../../types/aws'
import { IEpisodeSegment, IEpisodeTranscriptionSegment } from '../../types/jobs'
import { getBucket } from '../../utils/environment'
import { buildFilename, checkFileExists, getJsonFile, putJsonFile } from './s3'

const transcribe = new AWS.TranscribeService()
const axios = Axios.create()

export const createTranscriptionJob = async (
  episode: IEpisode,
  segment: IEpisodeSegment
): Promise<IEpisodeTranscriptionSegment> => {
  const jobName = buildFilename(episode, FILE_DESIGNATIONS.AWS_RAW_TRANSCRIPTION_SEGMENT, {
    duration: segment.duration,
    separator: '__',
    startTime: segment.startTime,
  })

  const filename = buildFilename(episode, FILE_DESIGNATIONS.AWS_RAW_TRANSCRIPTION_SEGMENT, {
    duration: segment.duration,
    startTime: segment.startTime,
    suffix: 'json',
  })

  const transcriptionSegment: IEpisodeTranscriptionSegment = {
    ...segment,
    transcriptionFile: filename,
    transcriptionJob: jobName,
  }

  if (checkTranscriptionJobExists(transcriptionSegment)) {
    const params: AWS.TranscribeService.StartTranscriptionJobRequest = {
      LanguageCode: 'en-US',
      Media: {
        MediaFileUri: segment.filename,
      },
      MediaFormat: 'mp3',
      MediaSampleRateHertz: 44100,
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
    transcriptionFile: filename,
    transcriptionJob: jobName,
  }
}

const checkTranscriptionFileExists = async (
  segment: IEpisodeTranscriptionSegment
): Promise<boolean> => {
  const bucket = getBucket()
  return await checkFileExists(bucket, segment.transcriptionFile)
}

export const checkTranscriptionJobExists = async (
  segment: IEpisodeTranscriptionSegment
): Promise<boolean> => {
  let exists = false

  if (await checkTranscriptionFileExists(segment)) {
    exists = true
  } else {
    const params = {
      TranscriptionJobName: segment.transcriptionFile,
    }
    const response = await transcribe.getTranscriptionJob(params).promise()

    if (response.TranscriptionJob) {
      exists = true
    } else {
      exists = false
    }
  }

  return exists
}

export const checkTranscriptionJobComplete = async (
  segment: IEpisodeTranscriptionSegment
): Promise<boolean> => {
  let complete = false

  if (await checkTranscriptionFileExists(segment)) {
    complete = true
  } else {
    const params = {
      TranscriptionJobName: segment.transcriptionJob,
    }
    const response = await transcribe.getTranscriptionJob(params).promise()
    if (response.TranscriptionJob && response.TranscriptionJob.TranscriptionJobStatus) {
      const status = response.TranscriptionJob.TranscriptionJobStatus
      complete = AWS_TRANSCRIBE_SUCCESS_STATUS.indexOf(status) !== -1
    } else {
      throw Error('No transcription job found called: ' + segment.transcriptionJob)
    }
  }

  return complete
}

export const getTranscription = async (
  segment: IEpisodeTranscriptionSegment
): Promise<IAWSTranscriptionResult> => {
  let transcription
  const bucket = getBucket()

  if (await checkTranscriptionFileExists(segment)) {
    transcription = (await getJsonFile(
      bucket,
      segment.transcriptionFile
    )) as IAWSTranscriptionResult
  } else {
    const params = {
      TranscriptionJobName: segment.transcriptionJob,
    }
    const response = await transcribe.getTranscriptionJob(params).promise()

    if (response.TranscriptionJob && response.TranscriptionJob.TranscriptionJobStatus) {
      const status = response.TranscriptionJob.TranscriptionJobStatus
      const complete = AWS_TRANSCRIBE_SUCCESS_STATUS.indexOf(status) !== -1
      if (complete) {
        if (
          response.TranscriptionJob.Transcript &&
          response.TranscriptionJob.Transcript.TranscriptFileUri
        ) {
          const url = response.TranscriptionJob.Transcript.TranscriptFileUri
          const transcriptResponse = await axios({
            method: 'get',
            responseType: 'json',
            url,
          })

          transcription = (transcriptResponse.data as IAWSTranscription).results
        } else {
          throw Error(
            `Could not find the transcription for a complete job: ${segment.transcriptionJob}`
          )
        }
      } else {
        throw Error(
          `Could not get the transcription for an incomplete job: ${segment.transcriptionJob}`
        )
      }
    } else {
      throw Error('No transcription job returned by getTranscriptionJob.')
    }
  }

  return transcription
}

export const saveTranscriptionToS3 = async (segment: IEpisodeTranscriptionSegment) => {
  const bucket = getBucket()
  if (!(await checkFileExists(bucket, segment.transcriptionFile))) {
    const transcription = await getTranscription(segment)
    await putJsonFile(bucket, segment.transcriptionFile, transcription)
  }
}
