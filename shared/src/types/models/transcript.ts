export interface ISpeaker {
  guid: string
  avatarURL: string
  isHost?: boolean
  name: string
}

export interface IStatementWord {
  startTime: number
  endTime: number
  content: string
}

export interface ITranscriptWord extends IStatementWord {
  confidence: number
  speaker: number
  awsSpeaker?: number
  watsonSpeaker?: number
}

interface IStatementBase {
  startTime: number
  endTime: number
  speaker: ISpeaker | number
  words: IStatementWord[]
}

export interface IStatement extends IStatementBase {
  speaker: ISpeaker
}

export interface IStatementDBRecord extends IStatementBase {
  speaker: number
}

export type ITranscript = ITranscriptWord[]
