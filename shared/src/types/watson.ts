export interface IWatsonCredentials {
  username: string
  password: string
}

export interface IWatsonWord {
  startTime: number
  endTime: number
  content: string
  confidence: number
}

export type WatsonJobId = string
