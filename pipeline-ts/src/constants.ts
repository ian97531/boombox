export const BUCKET_PREFIX = 'https://s3.amazonaws.com/'
export const FEED_URL = 'https://www.hellointernet.fm/podcast?format=rss'
export const IGNORED_FILENAMES = ['.write_access_check_file.temp']
export const EPISODE_INSERT_LIMIT = 1
export const MAX_SEGMENT_LENGTH = 55 * 60 // 55 minutes
export const SEGMENT_OVERLAP_LENGTH = 4 * 60 // 4 minutes
export const SLUGIFY_OPTIONS = {
  lower: true,
  remove: /[*+~.()#$/^&\[\]|\\?<>,=_'"!:@]/g,
  replacement: '-',
}

export const WATSON_TRANSCRIBE_SUCCESS_STATUS = 'completed'
export const WATSON_TRANSCRIBE_ERROR_STATUS = 'failed'

export enum AWS_TRANSCRIPTION {
  PRONUNCIATION = 'pronunciation',
  PUNCTUATION = 'punctuation',
  SPEAKER_0 = 'spk_0',
  SPEAKER_1 = 'spk_1',
}

export enum WATSON_TRANSCRIPTION {
  CONTENT = 0,
  CONFIDENCE = 1,
  START_TIME = 1,
  END_TIME = 2,
}
