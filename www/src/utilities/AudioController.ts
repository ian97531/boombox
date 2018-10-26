import { GetMp3 } from 'utilities/GetMp3'

export enum AudioControllerEventName {
  StatusChange,
  CurrentTimeUpdated,
}

export enum AudioControllerStatus {
  Idle = 'IDLE',
  Playing = 'PLAYING',
  Loading = 'LOADING',
  Error = 'ERROR',
}

type AudioControllerCallback = (eventName: AudioControllerEventName) => void

class AudioController {
  public status: AudioControllerStatus
  public currentTime = 0
  public duration: number
  public src: string

  private audioData: AudioBuffer
  private source: AudioBufferSourceNode
  private context = new AudioContext()
  private listeners: AudioControllerCallback[]
  private audioStream: GetMp3

  constructor() {
    this.status = AudioControllerStatus.Idle
    this.currentTime = 0
    this.listeners = []
  }

  public addListener(callback: AudioControllerCallback) {
    this.listeners.push(callback)
  }

  public setSrc = (src: string) => {
    this.src = src
    this.requestAudioBuffer()
  }

  public play(event = true) {
    if (this.status === AudioControllerStatus.Idle) {
      this.source = this.context.createBufferSource()
      this.source.buffer = this.audioData
      this.source.connect(this.context.destination)
      this.source.start(0, this.currentTime)
      if (event) {
        this.status = AudioControllerStatus.Playing
        this.callListeners(AudioControllerEventName.StatusChange)
      }

      console.log('play')
    }
  }

  public pause(event = true) {
    if (this.status === AudioControllerStatus.Playing) {
      this.source.stop(0)
      if (event) {
        this.status = AudioControllerStatus.Idle
        this.callListeners(AudioControllerEventName.StatusChange)
      }
      console.log('pause')
    }
  }

  public seek(newTime: number) {
    this.currentTime = newTime

    if (this.status === AudioControllerStatus.Playing) {
      this.pause(false)
      this.play(false)
      this.callListeners(AudioControllerEventName.CurrentTimeUpdated)
      console.log('seek')
    }
  }

  private requestAudioBuffer = () => {
    if (!this.src) {
      throw Error('Buffer could not be loaded. No source has been set for the AudioController.')
    }

    this.audioStream = new GetMp3(this.src)
    this.audioStream.onStart = this.onStreamStart
    this.audioStream.onNewFrames = this.onNewFrames
    this.audioStream.onComplete = this.onComplete
    this.audioStream.get()
  }

  private onStreamStart = (contentLength: number) => {
    console.log(`Content Length is: ${contentLength}`)
  }

  private onNewFrames = (data: ArrayBuffer, numFrames: number, numBytes: number) => {
    console.log(`${numBytes} bytes read`)
  }

  private onComplete = (duration: number) => {
    console.log(`Done! Duration is ${duration} seconds`)
  }

  // private decodeAudioBuffer = (data: ArrayBuffer) => {
  //   this.context.decodeAudioData(data).then(this.addAudioDataToSource)
  // }

  // private addAudioDataToSource = (audioData: AudioBuffer) => {
  //   this.audioData = audioData
  //   this.duration = audioData.duration
  //   console.log('ready')
  // }

  private callListeners(eventName: AudioControllerEventName) {
    this.listeners.forEach(cb => cb(eventName))
  }

  // private onTimeUpdated = (evt: Event) => {
  //   if (this.audioEl) {
  //     this.currentTime = this.audioEl.currentTime
  //     this.callListeners(AudioControllerEventName.CurrentTimeUpdated)
  //   }
  // }

  // private onLoadedMetadata = (evt: Event) => {
  //   if (this.audioEl) {
  //     this.status = AudioControllerStatus.Idle
  //     this.duration = this.audioEl.duration
  //     this.callListeners(AudioControllerEventName.StatusChange)
  //   }
  // }

  // private onPlay = () => {
  //   this.status = AudioControllerStatus.Playing
  //   this.callListeners(AudioControllerEventName.StatusChange)
  // }

  // private onPause = () => {
  //   this.status = AudioControllerStatus.Idle
  //   this.callListeners(AudioControllerEventName.StatusChange)
  // }
}

export default new AudioController()
