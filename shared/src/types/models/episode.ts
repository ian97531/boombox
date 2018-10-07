interface IEpisodeBase {
  podcastSlug: string
  publishedAt: Date | string
  duration: number
  imageURL: string
  mp3URL: string
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
