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
  transcript: string
}

export interface IEpisodeSegmentJob extends IEpisodeSegment {
  jobId?: string
  jobArn?: string
}

export interface IEpisodeTranscription {
  segments: IEpisodeTranscriptionSegment[]
  transcript: string
}

export interface IEpisodeTranscriptionRequest {
  segments: IEpisodeSegment[]
  transcript: string
}

export type IEpisodeSegmentPendingMessage = IEpisodeSegmentJob[]

export type IEpisodeTranscribeStartMessage = IEpisodeSegment[]

export type IAWSTranscribeStartMessage = IEpisodeTranscriptionRequest

export type IAWSTranscribePendingMessage = IEpisodeTranscription

export type IAWSNormalizeMessage = IEpisodeTranscription

export type IWatsonTranscribeStartMessage = IEpisodeTranscriptionRequest

export type IWatsonTranscribePendingMessage = IEpisodeTranscription

export type IWatsonNormalizeMessage = IEpisodeTranscription

export interface IEpisodeTranscribePendingMessage {
  awsTranscript: string
  watsonTranscript: string
}

export interface IEpisodeInsertMessage {
  transcript: string
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
