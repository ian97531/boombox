interface IEpisodeBase {
  podcastSlug: string
  publishTimestamp: number
  duration: number
  imageURL: string
  mp3URL: string
  publishedAt: Date | string
  slug: string
  speakers: string[]
  summary: string
  title: string
  totalStatements?: number
}

export interface IEpisode extends IEpisodeBase {
  publishedAt: Date
}

export interface IEpisodeDBRecord extends IEpisodeBase {
  publishedAt: string
}

interface IPodcastBase {
  slug: string
  author: string
  createdAt: Date | string
  episodes: { [id: string]: number } | string
  feedURL: string
  imageURL: string
  language: string
  lastCheckedAt: Date | string
  lastPublishedAt: Date | string
  podcastURL: string
  subtitle: string
  summary: string
  title: string
}

export interface IPodcast extends IPodcastBase {
  createdAt: Date
  episodes: { [id: string]: number }
  lastCheckedAt: Date
  lastPublishedAt: Date
}

export interface IPodcastDBRecord extends IPodcastBase {
  createdAt: string
  episodes: string
  lastCheckedAt: string
  lastPublishedAt: string
}

export interface ISpeaker {
  guid: string
  avatarURL: string
  isHost?: boolean
  name: string
}

interface IStatementBase {
  startTime: number
  endTime: number
  speaker: ISpeaker | number
  words: IWord[]
}

export interface IStatement extends IStatementBase {
  speaker: ISpeaker
}

export interface IStatementDBRecord extends IStatementBase {
  speaker: number
}

export interface IWord {
  startTime: number
  endTime: number
  content: string
}

export enum JOB_STATUS {
  UNSTARTED = 'UNSTARTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

interface IJobBase {
  startTime: string | Date
  podcastSlug: string
  publishTimestamp: number
  status: JOB_STATUS
  lambdas: {
    [key: string]: {
      startTime: string
      endTime?: string
      status: JOB_STATUS
      error?: string
    }
  }
  info: object
}
export interface IJob extends IJobBase {
  startTime: Date
}

export interface IJobDBRecord extends IJobBase {
  startTime: string
}

export interface IJobMessage {
  startTime: string
}
