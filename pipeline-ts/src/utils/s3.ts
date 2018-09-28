import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { DEFAULT_SECONDARY_SEPARATOR, DEFAULT_SEPARATOR, S3_DESIGNATIONS } from '../constants'

export const buildFilename = (
  episode: IEpisode,
  designation: S3_DESIGNATIONS,
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

  let filename = `${episode.podcastSlug}${separator}${
    episode.publishTimestamp
  }${secondarySeparator}${episode.slug}${separator}${cleanDesignation}`

  if (options && options.startTime !== undefined) {
    filename = `${filename}${secondarySeparator}${options.startTime}`

    if (options.duration) {
      filename = `${filename}${secondarySeparator}${options.duration}`
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
