export const BUCKET_PREFIX = 'https://s3.amazonaws.com/'
export const DEFAULT_SEPARATOR = '/'
export const DEFAULT_SECONDARY_SEPARATOR = '_'
export const FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'
export const IGNORED_FILENAMES = ['.write_access_check_file.temp']
export const MAX_SEGMENT_LENGTH = 55 * 60 // 55 minutes
export const SEGMENT_OVERLAP_LENGTH = 4 * 60 // 4 minutes
export const SLUGIFY_OPTIONS = {
  lower: true,
  remove: /[*+~.()#$/^&\[\]|\\?<>,=_'"!:@]/g,
  replacement: '-',
}

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
  COMPLETION_TOPIC = 'COMPLETION_TOPIC',
  INPUT_BUCKET = 'INPUT_BUCKET',
  INSERT_LIMIT = 'INSERT_LIMIT',
  ORIGINAL_AUDIO_BUCKET = 'ORIGINAL_AUDIO_BUCKET',
  OUTPUT_BUCKET = 'OUTPUT_BUCKET',
  REGION = 'REGION',
  SPLIT_PIPELINE_ID = 'SPLIT_PIPELINE_ID',
  TRANSCODE_PIPELINE_ID = 'TRANSCODE_PIPELINE_ID',
  TRANSCODED_AUDIO_BUCKET = 'TRANSCODED_AUDIO_BUCKET',
}

export enum S3_DESIGNATIONS {
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
