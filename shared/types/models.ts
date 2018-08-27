export interface IEpisode {
  podcastId: string
  episodeId: string
  title: string
  summary: string
  imageURL: string
  mp3URL: string
  duration: string
  publishedAt: string
  speakers: string[]
}

export interface IPodcast {
  podcastId: string
  title: string
  subtitle: string
  author: string
  summary: string
  category: string
  language: string
  imageURL: string
  episodeIds: string[]
  createdAt: string
  lastModifiedAt: string
  lastCheckedAt: string
}

export interface ISpeaker {
  guid: string
  name: string
  avatarURL: string
  isHost?: boolean
}

export interface IStatementDBResult {
  startTime: number
  endTime: number
  speaker: number
  words: IWord[]
}

export interface IStatement {
  startTime: number
  endTime: number
  speaker: ISpeaker
  words: IWord[]
}

export interface IWord {
  startTime: number
  endTime: number
  content: string
}
