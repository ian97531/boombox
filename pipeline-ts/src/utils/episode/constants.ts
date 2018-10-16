import { ENV as JOB_ENV } from '../job/constants'

export class ENV extends JOB_ENV {
  public static readonly AWS_TRANSCRIBE_QUEUE = 'AWS_TRANSCRIBE_QUEUE'
  public static readonly BUCKET = 'BUCKET'
  public static readonly EPISODES_TABLE = 'EPISODES_TABLE'
  public static readonly ERROR_TOPIC = 'ERROR_TOPIC'
  public static readonly JOBS_LOG_GROUP = 'JOBS_LOG_GROUP'
  public static readonly JOBS_TABLE = 'JOBS_TABLE'
  public static readonly PODCASTS_TABLE = 'PODCASTS_TABLE'
  public static readonly SEGMENTS_BUCKET = 'SEGMENTS_BUCKET'
  public static readonly SPEAKERS_TABLE = 'SPEAKERS_TABLE'
  public static readonly STATEMENTS_TABLE = 'STATEMENTS_TABLE'
  public static readonly STATEMENTS_TABLE_WCU = 'STATEMENTS_TABLE_WCU'
  public static readonly STATUS_TOPIC = 'STATUS_TOPIC'
  public static readonly TRANSCODE_PIPELINE_ID = 'TRANSCODE_PIPELINE_ID'
  public static readonly TRANSCRIPTIONS_BUCKET = 'TRANSCRIPTIONS_BUCKET'
  public static readonly WATSON_TRANSCRIBE_CREDENTIALS = 'WATSON_TRANSCRIBE_CREDENTIALS'
  public static readonly PODCAST_CHECK_FEED_QUEUE = 'PODCAST_CHECK_FEED_QUEUE'
  public static readonly EPISODE_DOWNLOAD_QUEUE = 'EPISODE_DOWNLOAD_QUEUE'
  public static readonly EPISODE_SEGMENT_QUEUE = 'EPISODE_SEGMENT_QUEUE'
  public static readonly EPISODE_TRANSCRIBE_QUEUE = 'EPISODE_TRANSCRIBE_QUEUE'
  public static readonly EPISODE_NORMALIZE_QUEUE = 'EPISODE_NORMALIZE_QUEUE'
  public static readonly EPISODE_INSERT_QUEUE = 'EPISODE_INSERT_QUEUE'
}
