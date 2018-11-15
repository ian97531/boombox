import Axios, { AxiosResponse } from 'axios'
import AudioParser from 'utilities/AudioParser'

export enum AudioControllerEventName {
  StatusChange,
  CurrentTimeUpdated,
  ProgressUpdated,
}

export enum AudioControllerStatus {
  Idle = 'IDLE',
  Playing = 'PLAYING',
  Loading = 'LOADING',
  Error = 'ERROR',
}

interface IAudioSegment {
  source?: AudioBufferSourceNode
  duration?: number
  startTime: number
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
  private audioParser: AudioParser
  private queuedAudioSegments: IAudioSegment[] = []
  private scheduledAudioSegments = new Set<IAudioSegment>()
  private playLoop: NodeJS.Timeout

  private playStartTime = 0
  private contextStartTime = 0
  private currentSegmentEndTime = 0
  private nextSegmentStartTime = 0

  public setAudio(src: string, duration: number = 0, bytes: number = 0) {
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
    this.audioParser = new AudioParser()
    this.audioParser.onComplete = this.onLoadComplete
    this.audioParser.onProgress = this.onLoadProgress

    // Ensure that we have the final URL...
    Axios.head(this.src).then(response => {
      const url = response.request.responseURL
      this.loadAudio(url, bytes)
    })
  }

  public addListener(callback: AudioControllerCallback) {
    this.listeners.push(callback)
  }

  public play() {
    if (this.status === AudioControllerStatus.Idle) {
      this.status = AudioControllerStatus.Playing
      this.contextStartTime = this.context.currentTime
      this.playStartTime = this.currentTime

      this.fetchNextSegment()
      this.scheduleNextSegment()

      this.playLoop = setInterval(() => {
        if (this.status === AudioControllerStatus.Playing) {
          if (this.scheduledAudioSegments.size < 2) {
            this.scheduleNextSegment()
          }

          this.updateCurrentTime()
        }
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
    this.currentTime = newTime
    this.reset()
    this.play()
    this.callListeners(AudioControllerEventName.CurrentTimeUpdated)
  }

  private loadAudio(url: string, totalBytes = 0) {
    if (!(window.fetch || ReadableStream)) {
      Axios.get(url, { responseType: 'arraybuffer' }).then(
        (response: AxiosResponse<ArrayBuffer>) => {
          this.audioParser.parseFile(response.data)
        }
      )
    } else {
      fetch(url)
        .then(response => response.body)
        .then(body => {
          if (body) {
            this.audioParser.parseStream(body, totalBytes)
          } else {
            throw Error('Got null response.body instead of a readable stream.')
          }
        })
    }
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

    for (const segment of this.scheduledAudioSegments.values()) {
      if (segment.source) {
        segment.source.stop()
      }
      this.scheduledAudioSegments.delete(segment)
    }

    this.queuedAudioSegments = []
    this.currentSegmentEndTime = 0
    this.nextSegmentStartTime = this.currentTime
  }

  private fetchNextSegment() {
    const startTime = this.nextSegmentStartTime
    const endTime = this.nextSegmentStartTime + SEGMENT_DURATION + SEGMENT_OVERLAP
    const arrayBuffer = this.audioParser.getArrayBufferForTime(startTime, endTime)
    this.nextSegmentStartTime += SEGMENT_DURATION

    const segment: IAudioSegment = {
      startTime,
    }
    this.queuedAudioSegments.push(segment)

    this.context.decodeAudioData(arrayBuffer, (audioData: AudioBuffer) => {
      if (this.status === AudioControllerStatus.Playing) {
        const source = this.context.createBufferSource()
        source.buffer = audioData
        segment.duration = audioData.duration
        segment.source = source
      }
    })
  }

  private scheduleNextSegment = () => {
    if (this.status === AudioControllerStatus.Playing && this.queuedAudioSegments.length) {
      const segment = this.queuedAudioSegments[0]
      if (segment.source && segment.duration) {
        this.queuedAudioSegments.shift()
        let nextSegmentStartTime: number | undefined
        let nextSegmentVolumeStartTime: number | undefined
        let nextSegmentVolumeEndTime: number | undefined

        if (this.currentSegmentEndTime) {
          nextSegmentStartTime = this.currentSegmentEndTime - SEGMENT_OVERLAP
          nextSegmentVolumeStartTime =
            nextSegmentStartTime + SEGMENT_OVERLAP / 2 - CROSSFADE_DURATION
        } else {
          nextSegmentStartTime = this.context.currentTime
          nextSegmentVolumeStartTime = this.context.currentTime
        }

        this.currentSegmentEndTime = nextSegmentStartTime + segment.duration
        nextSegmentVolumeEndTime = this.currentSegmentEndTime - SEGMENT_OVERLAP / 2

        const gainNode = this.context.createGain()
        gainNode.gain.setValueAtTime(0, nextSegmentStartTime)
        gainNode.gain.setTargetAtTime(1, nextSegmentVolumeStartTime, CROSSFADE_DURATION)
        gainNode.gain.setTargetAtTime(0, nextSegmentVolumeEndTime, CROSSFADE_DURATION)
        gainNode.connect(this.context.destination)

        segment.source.connect(gainNode)
        segment.source.start(nextSegmentStartTime)

        this.scheduledAudioSegments.add(segment)
        segment.source.onended = () => {
          this.scheduledAudioSegments.delete(segment)
        }
        this.fetchNextSegment()
      }
    }
  }

  private onLoadComplete = (duration: number) => {
    this.progress = 1
    if (this.status === AudioControllerStatus.Loading) {
      this.status = AudioControllerStatus.Idle
    }

    if (!this.duration) {
      this.duration = duration
    }
    this.callListeners(AudioControllerEventName.StatusChange)
  }

  private onLoadProgress = (progress: number) => {
    this.progress = progress

    // TODO(ian): Implement a real algorithm for determining when it's safe to start playing the
    // audio.
    if (progress > 0.01 && this.status === AudioControllerStatus.Loading) {
      this.status = AudioControllerStatus.Idle
    }

    this.callListeners(AudioControllerEventName.StatusChange)
  }

  private callListeners(eventName: AudioControllerEventName) {
    this.listeners.forEach(cb => cb(eventName))
  }
}

export default new AudioController()
