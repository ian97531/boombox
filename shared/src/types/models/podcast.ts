interface IPodcastBase {
  slug: string
  author: string
  createdAt: Date | string
  episodes: { [id: string]: string } | string
  feedURL: string
  imageURL: string
  language: string
  lastCheckedAt: Date | string
  lastPublishedAt: Date | string
  podcastURL: string
  speakers: string[]
  subtitle: string
  summary: string
  title: string
}

export interface IPodcast extends IPodcastBase {
  createdAt: Date
  episodes: { [id: string]: string }
  lastCheckedAt: Date
  lastPublishedAt: Date
}

export interface IPodcastDBRecord extends IPodcastBase {
  createdAt: string
  episodes: string
  lastCheckedAt: string
  lastPublishedAt: string
}
