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
