import {
  getEpisodeTranscriptions,
  getUntranscribedSegments,
  transcribeSegment,
  transcriptionsReadyToBeNormalized,
} from './transcribe'

export const aws = {
  getEpisodeTranscriptions,
  getUntranscribedSegments,
  transcribeSegment,
  transcriptionsReadyToBeNormalized,
}
