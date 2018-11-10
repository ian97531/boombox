import { Mp3Loader } from 'utilities/Mp3Loader'

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

interface IAudioChunk {
  source: AudioBufferSourceNode
  duration: number
}

const CHUNK_DURATION = 5
const CHUNK_OVERLAP = 0.5

type AudioControllerCallback = (eventName: AudioControllerEventName) => void

class AudioController {
  public status: AudioControllerStatus
  public currentTime = 0
  public duration: number
  public src: string
  public progress: number = 0

  private context: AudioContext
  private listeners: AudioControllerCallback[] = []

  private audioStream: Mp3Loader
  private chunks: IAudioChunk[] = []
  private currentPlayingChunkEndTime = 0
  private nextChunkStartTime = 0

  private playLoop: NodeJS.Timeout
  private scheduledSources = new Set<AudioBufferSourceNode>()

  public setAudio(src: string, duration: number = 0) {
    if (this.status === AudioControllerStatus.Playing) {
      this.pause()
    }

    if (this.context) {
      this.context.close()
    }

    const AudioContextSafe = (window as any).AudioContext || (window as any).webkitAudioContext
    this.context = new AudioContextSafe()
    this.currentTime = 0
    this.duration = duration
    this.status = AudioControllerStatus.Loading
    this.callListeners(AudioControllerEventName.StatusChange)
    this.audioStream = new Mp3Loader(src)
    this.audioStream.onComplete = this.onLoadComplete
    this.audioStream.onProgress = this.onLoadProgress
    this.audioStream.get()
  }

  public addListener(callback: AudioControllerCallback) {
    this.listeners.push(callback)
  }

  public play() {
    if (this.status === AudioControllerStatus.Idle) {
      this.status = AudioControllerStatus.Playing
      const startContextTime = this.context.currentTime
      const startTime = this.currentTime

      this.fetchNextChunk()
      this.scheduleNextSource()

      this.playLoop = setInterval(() => {
        if (this.chunks.length < 2) {
          this.fetchNextChunk()
        }

        if (this.scheduledSources.size < 2) {
          this.scheduleNextSource()
        }

        const playTime = this.context.currentTime - startContextTime
        this.currentTime = startTime + playTime
        this.callListeners(AudioControllerEventName.CurrentTimeUpdated)
      }, 500)

      this.callListeners(AudioControllerEventName.StatusChange)
    }
  }

  public pause() {
    if (this.status === AudioControllerStatus.Playing) {
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

  private reset() {
    this.status = AudioControllerStatus.Idle
    if (this.playLoop !== undefined) {
      clearInterval(this.playLoop)
    }

    for (const source of this.scheduledSources.values()) {
      source.stop()
      this.scheduledSources.delete(source)
    }

    this.chunks = []
    this.currentPlayingChunkEndTime = 0
    this.nextChunkStartTime = this.currentTime
    this.fetchNextChunk()
  }

  private fetchNextChunk() {
    const startTime = this.nextChunkStartTime
    const endTime = this.nextChunkStartTime + CHUNK_DURATION

    const startByte = this.audioStream.getByteForTime(startTime)
    const endByte = this.audioStream.getByteForTime(endTime + CHUNK_OVERLAP)
    const chunk = this.audioStream.getChunkAt(startByte, endByte)

    this.nextChunkStartTime += CHUNK_DURATION

    this.context.decodeAudioData(chunk, this.processDecodedAudio, this.handleDecodeError)
  }

  private processDecodedAudio = (audioData: AudioBuffer) => {
    const source = this.context.createBufferSource()
    source.buffer = audioData
    this.chunks.push({
      duration: audioData.duration,
      source,
    })
  }

  private handleDecodeError = (err: Error) => {
    console.log(err)
  }

  private scheduleNextSource = () => {
    const chunk = this.chunks.shift()

    if (chunk && this.status === AudioControllerStatus.Playing) {
      let startTime: number | undefined
      let volumeStartTime: number | undefined
      let volumeEndTime: number | undefined
      if (this.currentPlayingChunkEndTime) {
        startTime = this.currentPlayingChunkEndTime - CHUNK_OVERLAP
        volumeStartTime = startTime + CHUNK_OVERLAP / 2
      } else {
        startTime = this.context.currentTime
        volumeStartTime = this.context.currentTime
      }

      this.currentPlayingChunkEndTime = startTime + chunk.duration
      volumeEndTime = this.currentPlayingChunkEndTime - CHUNK_OVERLAP / 2

      const gainNode = this.context.createGain()
      chunk.source.connect(gainNode)

      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.setTargetAtTime(1, volumeStartTime, 0.03)
      gainNode.gain.setTargetAtTime(0, volumeEndTime, 0.03)

      chunk.source.connect(gainNode)
      gainNode.connect(this.context.destination)
      chunk.source.start(startTime)
      this.scheduledSources.add(chunk.source)
      chunk.source.onended = (ev: Event) => {
        this.scheduledSources.delete(chunk.source)
      }
    }
  }

  private onLoadComplete = (duration: number) => {
    if (this.duration === 0) {
      this.duration = 0
      this.reset()
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
