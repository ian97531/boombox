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

const CHUNK_DURATION = 5
const CHUNK_OVERLAP = 0.5

type AudioControllerCallback = (eventName: AudioControllerEventName) => void

class AudioController {
  public status: AudioControllerStatus
  public currentTime = 0
  public duration: number
  public src: string

  private context = new AudioContext()
  private listeners: AudioControllerCallback[]
  private audioStream: GetMp3
  private sources: AudioBufferSourceNode[] = []
  private durations: number[] = []
  private currentIndex = 0
  private currentStart = 0
  private currentEnd = 0
  private currentVolumeStart = 0
  private currentVolumeEnd = 0

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
      this.scheduleNextSource()
      setInterval(() => {
        this.scheduleNextSource()
      }, 100)
      if (event) {
        status = AudioControllerStatus.Playing
        this.callListeners(AudioControllerEventName.StatusChange)
      }
      console.log('play')
    }
  }

  public pause(event = true) {
    if (this.status === AudioControllerStatus.Playing) {
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

  private scheduleNextSource = () => {
    if (this.currentEnd === 0 || this.currentEnd - this.context.currentTime < 2) {
      const duration = this.durations[this.currentIndex]

      if (this.currentIndex === 0) {
        this.currentStart = this.context.currentTime
        this.currentVolumeStart = this.context.currentTime
      } else {
        this.currentStart = this.currentEnd - CHUNK_OVERLAP
        this.currentVolumeStart = this.currentStart + CHUNK_OVERLAP / 2
      }

      this.currentEnd = this.currentStart + duration
      this.currentVolumeEnd = this.currentEnd - CHUNK_OVERLAP / 2

      const gainNode = this.context.createGain()
      this.sources[this.currentIndex].connect(gainNode)

      gainNode.gain.setValueAtTime(0, this.currentStart)
      gainNode.gain.setValueAtTime(1, this.currentVolumeStart)
      gainNode.gain.setValueAtTime(0, this.currentVolumeEnd)

      this.sources[this.currentIndex].connect(gainNode)
      gainNode.connect(this.context.destination)
      this.sources[this.currentIndex].start(this.currentStart)
      this.currentIndex += 1
    }
  }

  private requestAudioBuffer = () => {
    if (!this.src) {
      throw Error('Buffer could not be loaded. No source has been set for the AudioController.')
    }

    this.audioStream = new GetMp3(this.src, CHUNK_DURATION, CHUNK_OVERLAP)
    this.audioStream.onNewFrames = this.onNewFrames
    this.audioStream.onComplete = this.onComplete
    this.audioStream.get()
  }

  private onNewFrames = (data: ArrayBuffer) => {
    this.decodeAudioBuffer(data)
  }

  private onComplete = () => {
    console.log('Done!')
  }

  private decodeAudioBuffer = (data: ArrayBuffer) => {
    this.context.decodeAudioData(data).then(this.addAudioDataToSource)
  }

  private addAudioDataToSource = (audioData: AudioBuffer) => {
    const source = this.context.createBufferSource()
    source.buffer = audioData
    this.sources.push(source)
    this.durations.push(audioData.duration)
  }

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
