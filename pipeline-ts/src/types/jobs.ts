import { IEpisode } from '@boombox/shared/src/types/models/episode'
import { IJob } from '@boombox/shared/src/types/models/job'

export type IEpisodeDownloadMessage = undefined

export interface IEpisodeSegmentStartMessage {
  bucket: string
  filename: string
}

export interface IEpisodeSegment {
  filename: string
  startTime: number
  duration: number
}

export interface IEpisodeTranscriptionSegment extends IEpisodeSegment {
  transcriptionJob: string
  transcriptionFile: string
}

export interface IEpisodeTranscription {
  segments: IEpisodeTranscriptionSegment[]
  transcriptionFile: string
}

export interface IEpisodeTranscriptionRequest {
  segments: IEpisodeSegment[]
  transcriptionFile: string
}

export type IEpisodeSegmentPendingMessage = IEpisodeSegment[]

export type IEpisodeTranscribeStartMessage = IEpisodeSegment[]

export type IAWSTranscribeStartMessage = IEpisodeTranscriptionRequest

export type IAWSTranscribePendingMessage = IEpisodeTranscription

export type IAWSNormalizeMessage = IEpisodeTranscription

export type IWatsonTranscribeStartMessage = IEpisodeTranscriptionRequest

export type IWatsonTranscribePendingMessage = IEpisodeTranscription

export type IWatsonNormalizeMessage = IEpisodeTranscription

export interface IEpisodeTranscribePendingMessage {
  aws: {
    transcriptionFile: string
  }
  watson: {
    transcriptionFile: string
  }
  final: {
    transcriptionFile: string
  }
}

export interface IEpisodeInsertMessage {
  transcriptionFile: string
  insertQueueFile: string
}

export interface IJobInput<Input> {
  episode: IEpisode
  job: IJob
  message: Input
}

export interface IJobMessage<T> {
  job: string
  message: T
}
