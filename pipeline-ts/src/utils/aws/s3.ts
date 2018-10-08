import { IEpisode } from '@boombox/shared/src/types/models/episode'
import * as AWS from 'aws-sdk'

const s3 = new AWS.S3()

export const DEFAULT_SEPARATOR = '/'
export const DEFAULT_SECONDARY_SEPARATOR = '_'
export enum FILE_DESIGNATIONS {
  ORIGINAL_AUDIO = 'original-audio',
  AUDIO_SEGMENT = 'audio-segment',
  AWS_RAW_TRANSCRIPTION_SEGMENT = 'aws-raw-transcription-segment',
  AWS_NORMALIZED_TRANSCRIPTION_SEGMENT = 'aws-normalized-transcription-segment',
  AWS_NORMALIZED_TRANSCRIPTION_FULL = 'aws-normalized-transcription-full',
  WATSON_RAW_TRANSCRIPTION_SEGMENT = 'watson-raw-transcription-segment',
  WATSON_NORMALIZED_TRANSCRIPTION_SEGMENT = 'watson-normalized-transcription-segment',
  WATSON_NORMALIZED_TRANSCRIPTION_FULL = 'watson-normalized-transcription-full',
  COMBINED_TRANSCRIPTION_FULL = 'combined-transcription-full',
  COMBINED_TRANSCRIPTION_INSERT_QUEUE = 'combined-transcription-insert-queue',
}

export const buildFilename = (
  episode: IEpisode,
  designation: FILE_DESIGNATIONS,
  options?: {
    startTime?: number
    duration?: number
    suffix?: string
    separator?: string
    secondarySeparator?: string
  }
): string => {
  const separator =
    options && options.separator !== undefined ? options.separator : DEFAULT_SEPARATOR
  const secondarySeparator =
    options && options.secondarySeparator !== undefined
      ? options.secondarySeparator
      : DEFAULT_SECONDARY_SEPARATOR

  const cleanDesignation = designation.replace(/[^a-z0-9]/gi, '')
  const cleanPublishedAt = episode.publishedAt.toISOString().replace(/\./gi, '-')

  let filename = `${episode.podcastSlug}${separator}${cleanPublishedAt}${secondarySeparator}${
    episode.slug
  }${separator}${cleanDesignation}`

  if (options && options.startTime !== undefined) {
    filename = `${filename}${secondarySeparator}${options.startTime}`

    if (options.duration) {
      const duration = Math.round(options.duration)
      filename = `${filename}${secondarySeparator}${duration}`
    } else {
      throw Error('buildFilename() requires a duration if a startTime is specified.')
    }
  } else if (options && options.duration) {
    throw Error('buildFilename() requires a startTime if a duration is specified.')
  }

  if (options && options.suffix !== undefined) {
    filename = `${filename}.${options.suffix}`
  }

  return filename
}

export const getFileInfo = (
  filename: string,
  options?: {
    separator?: string
    secondarySeparator?: string
  }
) => {
  const separator =
    options && options.separator !== undefined ? options.separator : DEFAULT_SEPARATOR
  const secondarySeparator =
    options && options.secondarySeparator !== undefined
      ? options.secondarySeparator
      : DEFAULT_SECONDARY_SEPARATOR

  const splitSuffix = filename.split('.')
  const splitSlashes = splitSuffix[0].split(separator)
  const episodeParts = splitSlashes[1].split(secondarySeparator)
  const fileparts = splitSlashes[2].split(secondarySeparator)

  return {
    designation: fileparts[0],
    duration: fileparts.length === 3 ? parseInt(fileparts[2], 10) : undefined,
    episodeSlug: episodeParts[1],
    podcastSlug: splitSlashes[0],
    publishTimestamp: parseInt(episodeParts[0], 10),
    startTime: fileparts.length === 3 ? parseInt(fileparts[1], 10) : undefined,
  }
}

export const checkFileExists = async (bucket: string, filename: string): Promise<boolean> => {
  let exists = false

  const params: AWS.S3.HeadObjectRequest = {
    Bucket: bucket,
    Key: filename,
  }

  try {
    await s3.headObject(params).promise()
    exists = true
  } catch (error) {
    exists = false
  }

  return exists
}

export const getFileStream = async (bucket: string, filename: string) => {
  const params: AWS.S3.GetObjectRequest = {
    Bucket: bucket,
    Key: filename,
  }
  return s3.getObject(params).createReadStream()
}

export const getFile = async <T>(bucket: string, filename: string): Promise<T> => {
  const params: AWS.S3.GetObjectRequest = {
    Bucket: bucket,
    Key: filename,
  }
  const response = await s3.getObject(params).promise()
  if (!response.Body) {
    throw Error('No body was returned in the s3 response.')
  }
  return response.Body as T
}

export const putFile = async <T>(bucket: string, filename: string, data: T): Promise<void> => {
  const params: AWS.S3.PutObjectRequest = {
    Body: data,
    Bucket: bucket,
    Key: filename,
  }

  await s3.putObject(params).promise()
}

export const getJsonFile = async <T>(bucket: string, filename: string): Promise<T> => {
  const response = await getFile(bucket, filename)

  return JSON.parse(response.toString())
}

export const putJsonFile = async <T>(bucket: string, filename: string, obj: T): Promise<void> => {
  await putFile(bucket, filename, JSON.stringify(obj, null, 2))
}
