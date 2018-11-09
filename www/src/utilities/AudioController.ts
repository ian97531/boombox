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

  private context: AudioContext
  private listeners: AudioControllerCallback[]
  private audioStream: GetMp3
  private sources: AudioBufferSourceNode[] = []
  private durations: number[] = []
  private currentStart = 0
  private currentEnd = 0
  private currentVolumeStart = 0
  private currentVolumeEnd = 0
  private nextQueuedStart = 0

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
      this.context = new AudioContext()
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
    if (this.sources.length < 2) {
      const startByte = this.audioStream.getByteForTime(this.nextQueuedStart)
      const endByte = this.audioStream.getByteForTime(this.nextQueuedStart + 5)
      const chunk = this.audioStream.getChunkAt(startByte, endByte)
      this.nextQueuedStart += 5
      this.context.decodeAudioData(chunk).then((audioData: AudioBuffer) => {
        const source = this.context.createBufferSource()
        source.buffer = audioData
        this.sources.push(source)
        this.durations.push(audioData.duration)
      })
    }

    if (this.currentEnd === 0 || this.currentEnd - this.context.currentTime < 2) {
      const source = this.sources.shift()
      const duration = this.durations.shift()

      if (source && duration) {
        if (this.currentEnd) {
          this.currentStart = this.currentEnd - CHUNK_OVERLAP
          this.currentVolumeStart = this.currentStart + CHUNK_OVERLAP / 2
        } else {
          this.currentStart = this.context.currentTime
          this.currentVolumeStart = this.context.currentTime
        }

        this.currentEnd = this.currentStart + duration
        this.currentVolumeEnd = this.currentEnd - CHUNK_OVERLAP / 2

        const gainNode = this.context.createGain()
        source.connect(gainNode)

        gainNode.gain.setValueAtTime(0, this.currentStart)
        gainNode.gain.setValueAtTime(1, this.currentVolumeStart)
        gainNode.gain.setValueAtTime(0, this.currentVolumeEnd)

        source.connect(gainNode)
        gainNode.connect(this.context.destination)
        source.start(this.currentStart)
      }
    }
  }

  private requestAudioBuffer = () => {
    if (!this.src) {
      throw Error('Buffer could not be loaded. No source has been set for the AudioController.')
    }

    this.audioStream = new GetMp3(this.src, CHUNK_DURATION, CHUNK_OVERLAP)
    this.audioStream.onComplete = this.onComplete
    this.audioStream.get()
  }

  private onComplete = () => {
    console.log('Ready!')
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
