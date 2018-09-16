import { IEpisode } from '@boombox/shared/src/types/models'

export interface IDynamoEpisode extends IEpisode {
  guid: string
  m4aURL?: string
  oggURL?: string
  watsonTranscription?: string
  awsTranscription?: string
  splits?: string[]
  splitAWSTranscriptions?: string[]
  splitWatsonTranscriptions?: string[]
  createdAt: string
  lastModifiedAt: string
}
