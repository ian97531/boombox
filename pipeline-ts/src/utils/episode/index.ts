import {
  episodeTranscriptionIsComplete as episodeAwsTranscriptionIsComplete,
  getEpisodeTranscriptions as getEpisodeAwsTranscriptions,
  getUntranscribedSegments as getUntranscribedAwsSegments,
  transcribeSegment as awsTranscribeSegment,
  transcriptionsReadyToBeNormalized as awsTranscriptionsReadyToBeNormalized,
} from './awsTranscribe'
import {
  getEpisodeTranscriptions as getEpisodeWatsonTranscriptions,
  getUntranscribedSegments as getUntranscribedWatsonSegments,
  transcribeSegment as watsonTranscribeSegment,
  transcriptionsReadyToBeNormalized as watsonTranscriptionsReadyToBeNormalized,
} from './watsonTranscribe'

export { ENV } from './constants'
export { EpisodeJob, ISegment } from './EpisodeJob'
export { episodeCaller, episodeHandler } from './episodeHandler'

export const aws = {
  episodeTranscriptionIsComplete: episodeAwsTranscriptionIsComplete,
  getEpisodeTranscriptions: getEpisodeAwsTranscriptions,
  getUntranscribedSegments: getUntranscribedAwsSegments,
  transcribeSegment: awsTranscribeSegment,
  transcriptionsReadyToBeNormalized: awsTranscriptionsReadyToBeNormalized,
}

export const watson = {
  getEpisodeTranscriptions: getEpisodeWatsonTranscriptions,
  getUntranscribedSegments: getUntranscribedWatsonSegments,
  transcribeSegment: watsonTranscribeSegment,
  transcriptionsReadyToBeNormalized: watsonTranscriptionsReadyToBeNormalized,
}
