import Axios, { AxiosResponse } from 'axios'
import { MP3Decoder } from 'utilities/audio-decoders/mp3'

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

interface IAudioSegment {
  source: AudioBufferSourceNode
  duration: number
}

const SEGMENT_DURATION = 5
const SEGMENT_OVERLAP = 0.5
const CROSSFADE_DURATION = 0.03

type AudioControllerCallback = (eventName: AudioControllerEventName) => void

class AudioController {
  public currentTime = 0
  public duration: number
  public progress: number = 0
  public src: string
  public status: AudioControllerStatus

  private listeners: AudioControllerCallback[] = []

  private context: AudioContext
  private audioDecoder: MP3Decoder
  private queuedAudioSegments: IAudioSegment[] = []
  private scheduledAudioSegments = new Set<IAudioSegment>()
  private playLoop: NodeJS.Timeout

  private playStartTime = 0
  private contextStartTime = 0
  private currentSegmentEndTime = 0
  private nextSegmentStartTime = 0

  public setAudio(src: string, duration: number = 0) {
    const AudioContextSafe = (window as any).AudioContext || (window as any).webkitAudioContext

    if (this.status === AudioControllerStatus.Playing) {
      this.reset()
    }

    if (this.context) {
      this.context.close()
    }

    this.context = new AudioContextSafe()
    this.currentTime = 0
    this.playStartTime = 0
    this.contextStartTime = 0
    this.currentSegmentEndTime = 0
    this.nextSegmentStartTime = 0
    this.duration = duration
    this.src = src
    this.status = AudioControllerStatus.Loading
    this.callListeners(AudioControllerEventName.StatusChange)
    this.audioDecoder = new MP3Decoder()
    this.audioDecoder.onComplete = this.onLoadComplete
    this.audioDecoder.onProgress = this.onLoadProgress

    Axios.head(this.src).then((redirect: AxiosResponse) => {
      if (redirect.request) {
        const url = redirect.request.responseURL
        if (!(window.fetch || ReadableStream)) {
          Axios.get(url, { responseType: 'arraybuffer' }).then(
            (response: AxiosResponse<ArrayBuffer>) => {
              this.audioDecoder.parseFile(response.data)
            }
          )
        } else {
          fetch(url)
            .then(response => response.body)
            .then(body => {
              if (body) {
                this.audioDecoder.parseStream(body)
              } else {
                throw Error('Got null response.body instead of a readable stream.')
              }
            })
        }
      }
    })
  }

  public addListener(callback: AudioControllerCallback) {
    this.listeners.push(callback)
  }

  public play() {
    if (this.status === AudioControllerStatus.Idle) {
      console.log(`Starting with ${this.queuedAudioSegments.length} queued segments`)
      console.log(`Starting with ${this.scheduledAudioSegments.values.length} scheduled segments`)
      this.status = AudioControllerStatus.Playing
      this.contextStartTime = this.context.currentTime
      this.playStartTime = this.currentTime

      this.fetchNextSegment()
      this.scheduleNextSegment()

      this.playLoop = setInterval(() => {
        if (this.queuedAudioSegments.length < 2) {
          this.fetchNextSegment()
        }

        if (this.scheduledAudioSegments.size < 2) {
          this.scheduleNextSegment()
        }

        this.updateCurrentTime()
      }, 500)

      this.callListeners(AudioControllerEventName.StatusChange)
    }
  }

  public pause() {
    if (this.status === AudioControllerStatus.Playing) {
      this.updateCurrentTime()
      this.reset()
      this.callListeners(AudioControllerEventName.StatusChange)
    }
  }

  public seek(newTime: number) {
    console.log('seek time: ' + newTime)
    this.currentTime = newTime
    this.reset()
    this.play()
    this.callListeners(AudioControllerEventName.CurrentTimeUpdated)
  }

  private updateCurrentTime() {
    const playDuration = this.context.currentTime - this.contextStartTime
    this.currentTime = this.playStartTime + playDuration
    this.callListeners(AudioControllerEventName.CurrentTimeUpdated)
  }

  private reset() {
    this.status = AudioControllerStatus.Idle
    if (this.playLoop !== undefined) {
      clearInterval(this.playLoop)
    }

    for (const segement of this.scheduledAudioSegments.values()) {
      segement.source.stop()
      this.scheduledAudioSegments.delete(segement)
      console.log('deleting segment')
    }

    this.queuedAudioSegments = []
    this.currentSegmentEndTime = 0
    this.nextSegmentStartTime = this.currentTime
    this.fetchNextSegment()
  }

  private fetchNextSegment() {
    const startTime = this.nextSegmentStartTime
    const endTime = this.nextSegmentStartTime + SEGMENT_DURATION

    const startByte = this.audioDecoder.getSafeByteOffsetForTime(startTime)
    const endByte = this.audioDecoder.getSafeByteOffsetForTime(endTime + SEGMENT_OVERLAP)
    const audioSegment = this.audioDecoder.getBytes(startByte, endByte)

    this.nextSegmentStartTime += SEGMENT_DURATION

    this.context.decodeAudioData(audioSegment, this.queueDecodedAudioSegment)
  }

  private queueDecodedAudioSegment = (audioData: AudioBuffer) => {
    const source = this.context.createBufferSource()
    source.buffer = audioData
    this.queuedAudioSegments.push({
      duration: audioData.duration,
      source,
    })
  }

  private scheduleNextSegment = () => {
    const segement = this.queuedAudioSegments.shift()

    if (segement && this.status === AudioControllerStatus.Playing) {
      let nextSegmentStartTime: number | undefined
      let nextSegmentVolumeStartTime: number | undefined
      let nextSegmentVolumeEndTime: number | undefined

      if (this.currentSegmentEndTime) {
        nextSegmentStartTime = this.currentSegmentEndTime - SEGMENT_OVERLAP
        nextSegmentVolumeStartTime = nextSegmentStartTime + SEGMENT_OVERLAP / 2 - CROSSFADE_DURATION
      } else {
        nextSegmentStartTime = this.context.currentTime
        nextSegmentVolumeStartTime = this.context.currentTime
      }

      this.currentSegmentEndTime = nextSegmentStartTime + segement.duration
      nextSegmentVolumeEndTime = this.currentSegmentEndTime - SEGMENT_OVERLAP / 2

      const gainNode = this.context.createGain()
      gainNode.gain.setValueAtTime(0, nextSegmentStartTime)
      gainNode.gain.setTargetAtTime(1, nextSegmentVolumeStartTime, CROSSFADE_DURATION)
      gainNode.gain.setTargetAtTime(0, nextSegmentVolumeEndTime, CROSSFADE_DURATION)
      gainNode.connect(this.context.destination)

      segement.source.connect(gainNode)
      segement.source.start(nextSegmentStartTime)

      this.scheduledAudioSegments.add(segement)
      segement.source.onended = () => {
        this.scheduledAudioSegments.delete(segement)
      }
    }
  }

  private onLoadComplete = (duration: number) => {
    if (this.duration === 0) {
      this.duration = duration

      if (this.status !== AudioControllerStatus.Playing) {
        this.reset()
      }
    }
    this.progress = 1
    this.callListeners(AudioControllerEventName.StatusChange)
  }

  private onLoadProgress = (duration: number) => {
    if (this.duration) {
      this.progress = duration / this.duration
    }

    if (duration > 10 && this.status === AudioControllerStatus.Loading) {
      this.reset()
    }

    this.callListeners(AudioControllerEventName.StatusChange)
  }

  private callListeners(eventName: AudioControllerEventName) {
    this.listeners.forEach(cb => cb(eventName))
  }
}

export default new AudioController()
