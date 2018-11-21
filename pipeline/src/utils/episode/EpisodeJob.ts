import slugify from 'slugify'

import { db, GoogleSpeechJobId, IEpisode, IPodcast } from '@boombox/shared'
import { SLUGIFY_OPTIONS } from '../../pipeline-constants'

const MAX_SEGMENT_LENGTH = 190 * 60 // 190 minutes
const SEGMENT_OVERLAP_LENGTH = 4 * 60 // 4 minutes

enum DESIGNATIONS {
  ORIGINAL_AUDIO = 'original-audio',
  AUDIO_SEGMENT = 'audio-segment',
  RAW_TRANSCRIPTION_SEGMENT = 'google-raw-transcription-segment',
  NORMALIZED_TRANSCRIPTION_SEGMENT = 'google-normalized-transcription-segment',
  FINAL_TRANSCRIPTION = 'final-transcription',
  FINAL_TRANSCRIPTION_INSERT_QUEUE = 'final-transcription-insert-queue',
}

interface IAudio {
  duration: number
  filename: string
  startTime: number
}

interface IBuckets {
  episode: string
  segments?: string
  transcriptions?: string
}

export type ITranscriptionJobName = string | number

export interface ITranscriptionJob {
  normalizedTranscriptFilename: string
  rawTranscriptFilename: string
  jobName?: GoogleSpeechJobId
}

export interface ISegment {
  audio: IAudio
  transcription: ITranscriptionJob
}

export interface ISerializedEpisodeJob {
  audio?: IAudio
  bucket: string
  bytes?: number
  duration?: number
  imageURL: string
  mp3URL: string
  podcastSlug: string
  publishedAt: string
  segments: ISegment[]
  segmentsBucket: string
  slug: string
  speakers: string[]
  summary: string
  title: string
  transcriptions?: {
    final: string
    insertQueue: string
  }
  transcriptionsBucket: string
  totalStatements?: number
}

export class EpisodeJob {
  public static async createFromFeed(
    buckets: IBuckets,
    podcast: IPodcast,
    item: any
  ): Promise<EpisodeJob | void> {
    const publishedAt = new Date()
    publishedAt.setTime(Date.parse(item.pubDate))

    // In case the title can't be slugified (because maybe it's all emojis).
    const slugified = slugify(item.title, SLUGIFY_OPTIONS)
    const title = slugified === '-' ? `Episode #${item.itunes.episode}` : item.title
    const slug = slugified === '-' ? slugify(title, SLUGIFY_OPTIONS) : slugified
    const episode = {
      bucket: buckets.episode,
      imageURL: item.itunes.image.replace(/^http:/i, 'https:'),
      mp3URL: item.enclosure.url.replace(/^http:/i, 'https:'),
      podcastSlug: podcast.slug,
      publishedAt: publishedAt.toISOString(),
      segments: [],
      segmentsBucket: buckets.segments || buckets.episode,
      slug,
      speakers: podcast.speakers,
      summary: item.content,
      title,
      transcriptionsBucket: buckets.transcriptions || buckets.episode,
    }

    if (!podcast.episodes[episode.slug]) {
      podcast.episodes[episode.slug] = episode.publishedAt
      await db.podcasts.putPodcast(podcast)
      return new EpisodeJob(episode)
    }
  }

  public bucket: string
  public duration: number
  public audio?: IAudio
  public imageURL: string
  public mp3URL: string
  public bytes: number
  public podcastSlug: string
  public publishedAt: Date
  public segments: ISegment[]
  public segmentsBucket: string
  public slug: string
  public speakers: string[]
  public summary: string
  public title: string
  public transcriptions: {
    final: string
    insertQueue: string
  }
  public transcriptionsBucket: string
  public totalStatements?: number

  constructor(episode: ISerializedEpisodeJob) {
    for (const key of Object.keys(episode)) {
      this[key] = episode[key]
    }

    this.publishedAt = new Date(episode.publishedAt)

    if (!episode.transcriptions) {
      this.transcriptions = {
        final: this.buildFilename(DESIGNATIONS.FINAL_TRANSCRIPTION, 'json'),
        insertQueue: this.buildFilename(DESIGNATIONS.FINAL_TRANSCRIPTION_INSERT_QUEUE, 'json'),
      }
    }
  }

  public async completeWithError(): Promise<void> {
    const podcast = await db.podcasts.getPodcast(this.podcastSlug)
    if (podcast.episodes[this.slug]) {
      delete podcast.episodes[this.slug]
      await db.podcasts.putPodcast(podcast)
    }
  }

  public getEpisode(): IEpisode {
    return {
      bytes: this.bytes,
      duration: this.duration,
      imageURL: this.imageURL,
      mp3URL: this.mp3URL,
      podcastSlug: this.podcastSlug,
      publishedAt: this.publishedAt,
      slug: this.slug,
      speakers: this.speakers,
      summary: this.summary,
      title: this.title,
      totalStatements: this.totalStatements,
    }
  }

  public createSegments() {
    const numSegments = Math.ceil(this.duration / MAX_SEGMENT_LENGTH)
    const segmentDuration = Math.ceil(this.duration / numSegments)
    let startTime = 0
    let index = 0

    while (index < numSegments - 1) {
      // Create a segment and a small segment that overlaps the previous and next segments
      const duration = index === 0 ? segmentDuration : segmentDuration + SEGMENT_OVERLAP_LENGTH
      this.segments.push(this.createSegment(startTime, duration))
      startTime = startTime + segmentDuration - SEGMENT_OVERLAP_LENGTH
      index += 1
    }

    // Create the last segment to the end of the episode.
    const finalDuration = Math.ceil(this.duration - startTime)
    this.segments.push(this.createSegment(startTime, finalDuration))

    this.audio = {
      duration: this.duration,
      filename: this.buildFilename(DESIGNATIONS.ORIGINAL_AUDIO, 'mp3', {
        duration: this.duration,
        startTime: 0,
      }),
      startTime: 0,
    }
  }

  public serialize(): ISerializedEpisodeJob {
    return {
      audio: this.audio,
      bucket: this.bucket,
      bytes: this.bytes,
      duration: this.duration,
      imageURL: this.imageURL,
      mp3URL: this.mp3URL,
      podcastSlug: this.podcastSlug,
      publishedAt: this.publishedAt.toISOString(),
      segments: this.segments,
      segmentsBucket: this.segmentsBucket,
      slug: this.slug,
      speakers: this.speakers,
      summary: this.summary,
      title: this.title,
      transcriptions: this.transcriptions,
      transcriptionsBucket: this.transcriptionsBucket,
    }
  }

  private buildFilename(
    designation: DESIGNATIONS,
    suffix: string,
    options?: {
      duration?: number
      startTime?: number
    }
  ): string {
    const cleanDesignation = designation.replace(/[^a-z0-9-]/gi, '')
    const cleanPublishedAt = this.publishedAt.toISOString().replace(/[\.:]/gi, '-')

    let filename = `${this.podcastSlug}/${cleanPublishedAt}_${this.slug}/${cleanDesignation}`

    if (options && options.startTime !== undefined && options.duration !== undefined) {
      const duration = Math.round(options.duration)
      filename = `${filename}_${options.startTime}_${duration}`
    }

    filename = `${filename}.${suffix}`

    return filename
  }

  private createSegment(startTime: number, duration: number): ISegment {
    const audioFilename = this.buildFilename(DESIGNATIONS.AUDIO_SEGMENT, 'flac', {
      duration,
      startTime,
    })

    const normalizedTranscriptFilename = this.buildFilename(
      DESIGNATIONS.NORMALIZED_TRANSCRIPTION_SEGMENT,
      'json',
      {
        duration,
        startTime,
      }
    )

    const rawTranscriptFilename = this.buildFilename(
      DESIGNATIONS.RAW_TRANSCRIPTION_SEGMENT,
      'json',
      {
        duration,
        startTime,
      }
    )

    return {
      audio: {
        duration,
        filename: audioFilename,
        startTime,
      },
      transcription: {
        normalizedTranscriptFilename,
        rawTranscriptFilename,
      },
    }
  }
}
