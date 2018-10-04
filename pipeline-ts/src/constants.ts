export const BUCKET_PREFIX = 'https://s3.amazonaws.com/'
export const DEFAULT_SEPARATOR = '/'
export const DEFAULT_SECONDARY_SEPARATOR = '_'
export const FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'
export const IGNORED_FILENAMES = ['.write_access_check_file.temp']
export const EPISODE_INSERT_LIMIT = 2
export const MAX_SEGMENT_LENGTH = 55 * 60 // 55 minutes
export const SEGMENT_OVERLAP_LENGTH = 4 * 60 // 4 minutes
export const SLUGIFY_OPTIONS = {
  lower: true,
  remove: /[*+~.()#$/^&\[\]|\\?<>,=_'"!:@]/g,
  replacement: '-',
}

export const TRANSCODE_SUCCESS_STATUSES = ['Complete']
export const TRANSCODE_ERROR_STATUSES = ['Canceled', 'Error']

export const M4A_PRESET = '1351620000001-100120' // M4A AAC 160 44k
export const MP3_PRESET = '1351620000001-300030' // MP3 160 44k
export const OGG_PRESET = '1531717800275-2wz911' // OGG Vorbis 160 44k

export enum AWS_TRANSCRIPTION {
  PRONUNCIATION = 'pronunciation',
  PUNCTUATION = 'punctuation',
  SPEAKER_0 = 'spk_0',
  SPEAKER_1 = 'spk_1',
}

export enum ENV {
  AWS_LAMBDA_FUNCTION_NAME = 'AWS_LAMBDA_FUNCTION_NAME',
  AWS_TRANSCRIBE_QUEUE = 'AWS_TRANSCRIBE_QUEUE',
  BUCKET = 'BUCKET',
  NEXT_QUEUE = 'NEXT_QUEUE',
  EPISODES_TABLE = 'EPISODES_TABLE',
  ERROR_TOPIC = 'ERROR_TOPIC',
  JOBS_TABLE = 'JOBS_TABLE',
  PODCASTS_TABLE = 'PODCASTS_TABLE',
  SPEAKERS_TABLE = 'SPEAKERS_TABLE',
  STATEMENTS_TABLE = 'STATEMENTS_TABLE',
  STATEMENTS_TABLE_WCU = 'STATEMENTS_TABLE_WCU',
  STATUS_TOPIC = 'STATUS_TOPIC',
  TRANSCODE_PIPELINE_ID = 'TRANSCODE_PIPELINE_ID',
  WATSON_TRANSCRIBE_CREDENTIALS = 'WATSON_TRANSCRIBE_CREDENTIALS',
  WATSON_TRANSCRIBE_QUEUE = 'WATSON_TRANSCRIBE_QUEUE',
}

export enum FILE_DESIGNATIONS {
  ORIGINAL_AUDIO = 'original-audio',
  AUDIO_SEGMENT = 'audio-segment',
  AWS_RAW_TRANSCRIPTION_SEGMENT = 'aws-raw-transcription-segment',
  AWS_NORMALIZED_TRANSCRIPTION_SEGMENT = 'aws-normalized-transcription-segment',
  AWS_NORMALIZED_TRANSCRIPTION_FULL = 'aws-normalized-transcription-full',
  WATSON_RAW_TRANSCRIPTION_SEGMENT = 'watson-raw-transcription-segment',
  WATSON_NORMALIZED_TRANSCRIPTION_SEGMENT = 'watson-normalized-transcription-segment',
  WATSON_NORMALIZED_TRANSCRIPTION_FULL = 'watson-normalized-transcription-full',
  COMBINED_TRANSCRIPTION_FULL = 'combined-transcription-full',
}
