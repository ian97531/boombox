import { IEpisode } from '@boombox/shared/src/types/models/episode'
import slugify from 'slugify'
import { SLUGIFY_OPTIONS } from '../../constants'

const MAX_SEGMENT_LENGTH = 55 * 60 // 55 minutes
const SEGMENT_OVERLAP_LENGTH = 4 * 60 // 4 minutes

enum DESIGNATIONS {
  ORIGINAL_AUDIO = 'original-audio',
  AUDIO_SEGMENT = 'audio-segment',
  AWS_TRANSCRIPTION_SEGMENT = 'aws-transcription-segment',
  AWS_TRANSCRIPTION = 'aws-transcription-full',
  WATSON_TRANSCRIPTION_SEGMENT = 'watson-transcription-segment',
  WATSON_TRANSCRIPTION = 'watson-transcription',
  FINAL_TRANSCRIPTION = 'final-transcription',
  FINAL_TRANSCRIPTION_INSERT_QUEUE = 'final-transcription-insert-queue',
}

interface IAudio {
  duration: number
  filename: string
  startTime: number
}

interface ITranscriptionJob {
  filename: string
  jobName?: string
}

export interface ISegment {
  audio: IAudio
  transcription: {
    aws: ITranscriptionJob
    watson: ITranscriptionJob
  }
}

export interface ISerializedEpisodeJob {
  audio?: IAudio
  bucket: string
  duration?: number
  imageURL: string
  mp3URL: string
  podcastSlug: string
  publishedAt: string
  segments: ISegment[]
  slug: string
  speakers: string[]
  summary: string
  title: string
  transcriptions?: {
    aws: string
    final: string
    insertQueue: string
    watson: string
  }
  totalStatements?: number
}

export class EpisodeJob {
  public static createFromFeed(bucket: string, podcastSlug: string, item: any): EpisodeJob {
    const publishedAt = new Date()
    publishedAt.setTime(Date.parse(item.pubDate))

    const episode = {
      bucket,
      imageURL: item.itunes.image,
      mp3URL: item.enclosure.url,
      podcastSlug,
      publishedAt: publishedAt.toISOString(),
      segments: [],
      slug: slugify(item.title, SLUGIFY_OPTIONS),
      speakers: [],
      summary: item.content,
      title: item.title,
    }

    return new EpisodeJob(episode)
  }

  public bucket: string
  public duration: number
  public audio?: IAudio
  public imageURL: string
  public mp3URL: string
  public podcastSlug: string
  public publishedAt: Date
  public segments: ISegment[]
  public slug: string
  public speakers: string[]
  public summary: string
  public title: string
  public transcriptions: {
    aws: string
    final: string
    insertQueue: string
    watson: string
  }
  public totalStatements?: number

  constructor(episode: ISerializedEpisodeJob) {
    for (const key of Object.keys(episode)) {
      this[key] = episode[key]
    }

    this.publishedAt = new Date(episode.publishedAt)

    if (!episode.transcriptions) {
      this.transcriptions = {
        aws: this.buildFilename(DESIGNATIONS.AWS_TRANSCRIPTION, 'json'),
        final: this.buildFilename(DESIGNATIONS.FINAL_TRANSCRIPTION, 'json'),
        insertQueue: this.buildFilename(DESIGNATIONS.FINAL_TRANSCRIPTION_INSERT_QUEUE, 'json'),
        watson: this.buildFilename(DESIGNATIONS.WATSON_TRANSCRIPTION, 'json'),
      }
    }
  }

  public getEpisode(): IEpisode {
    return {
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

  public createSegments(episodeDuration: number) {
    const numSegments = Math.ceil(episodeDuration / MAX_SEGMENT_LENGTH)
    const segmentDuration = Math.ceil(episodeDuration / numSegments)
    let startTime = 0
    let index = 0

    while (index < numSegments - 1) {
      // Create a segment and a small segment that overlaps the previous and next segments
      const overlapStartTime = startTime + segmentDuration - SEGMENT_OVERLAP_LENGTH / 2
      this.segments.push(this.createSegment(startTime, segmentDuration))
      this.segments.push(this.createSegment(overlapStartTime, SEGMENT_OVERLAP_LENGTH))
      startTime += segmentDuration
      index += 1
    }

    // Create the last segment to the end of the episode.
    const finalDuration = Math.ceil(episodeDuration - startTime)
    this.segments.push(this.createSegment(startTime, finalDuration))

    this.audio = {
      duration: episodeDuration,
      filename: this.buildFilename(DESIGNATIONS.ORIGINAL_AUDIO, 'mp3', {
        duration: episodeDuration,
        startTime: 0,
      }),
      startTime: 0,
    }
  }

  public serialize(): ISerializedEpisodeJob {
    return {
      audio: this.audio,
      bucket: this.bucket,
      duration: this.duration,
      imageURL: this.imageURL,
      mp3URL: this.mp3URL,
      podcastSlug: this.podcastSlug,
      publishedAt: this.publishedAt.toISOString(),
      segments: this.segments,
      slug: this.slug,
      speakers: this.speakers,
      summary: this.summary,
      title: this.title,
      transcriptions: this.transcriptions,
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
    const audioFilename = this.buildFilename(DESIGNATIONS.AUDIO_SEGMENT, 'mp3', {
      duration,
      startTime,
    })

    const awsFilename = this.buildFilename(DESIGNATIONS.AWS_TRANSCRIPTION_SEGMENT, 'json', {
      duration,
      startTime,
    })

    const watsonFilename = this.buildFilename(DESIGNATIONS.WATSON_TRANSCRIPTION_SEGMENT, 'json', {
      duration,
      startTime,
    })

    return {
      audio: {
        duration,
        filename: audioFilename,
        startTime,
      },
      transcription: {
        aws: { filename: awsFilename },
        watson: { filename: watsonFilename },
      },
    }
  }
}