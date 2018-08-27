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

/**
 * An AudioController is a singleton class that is used to control the audio that the page
 * is playing. It is responsible for creating, listening to, and destroying an underlying HTML5
 * audio element.
 *
 * Below is a basic overview of how this class should be used:
 *
 *   +-----------------+
 *   |                 |
 *   | HTML5 Audio El  |
 *   |                 |
 *   +--^---------+----+
 *      |         |
 *   +--+---------v----+    +-------+    +------------+
 *   |                 +---->       +---->            |
 *   | AudioController |    | Redux |    | Components |
 *   |                 <----+       <----+            |
 *   +-----------------+    +-------+    +------------+
 *
 * The gist is that the AudioController listens to changes from its underlying HTML5 Audio element
 * and forwards that information along to any listeners. When a component wishes to update the
 * playing audio it should only ever dispatch actions which will under the hood update the
 * AudioController.
 */
class AudioController {
  public status: AudioControllerStatus
  public currentTime: number
  public duration: number

  private audioEl: HTMLAudioElement | null
  private listeners: AudioControllerCallback[]

  constructor() {
    this.status = AudioControllerStatus.Idle
    this.currentTime = 0
    this.listeners = []
  }

  public addListener(callback: AudioControllerCallback) {
    this.listeners.push(callback)
  }

  public setSrc(src: string) {
    this.createAndLoadAudioElement(src)
  }

  public play() {
    if (this.audioEl) {
      this.audioEl.play()
    }
  }

  public seek(newTime: number) {
    if (this.audioEl) {
      this.audioEl.currentTime = newTime
      this.play()
    }
  }

  private createAndLoadAudioElement(src: string) {
    if (this.audioEl) {
      this.audioEl.pause()
      this.audioEl.removeEventListener('timeupdate', this.onTimeUpdated)
      this.audioEl.removeEventListener('loadedmetadata', this.onLoadedMetadata)
      this.audioEl.removeEventListener('play', this.onPlay)
      this.audioEl.removeEventListener('pause', this.onPause)
      this.audioEl = null
    }

    this.status = AudioControllerStatus.Loading
    this.callListeners(AudioControllerEventName.StatusChange)

    this.audioEl = document.createElement('audio')
    this.audioEl.addEventListener('timeupdate', this.onTimeUpdated)
    this.audioEl.addEventListener('loadedmetadata', this.onLoadedMetadata)
    this.audioEl.addEventListener('play', this.onPlay)
    this.audioEl.addEventListener('pause', this.onPause)
    this.audioEl.src = src
  }

  private callListeners(eventName: AudioControllerEventName) {
    this.listeners.forEach(cb => cb(eventName))
  }

  private onTimeUpdated = (evt: Event) => {
    if (this.audioEl) {
      this.currentTime = this.audioEl.currentTime
      this.callListeners(AudioControllerEventName.CurrentTimeUpdated)
    }
  }

  private onLoadedMetadata = (evt: Event) => {
    if (this.audioEl) {
      this.status = AudioControllerStatus.Idle
      this.duration = this.audioEl.duration
      this.callListeners(AudioControllerEventName.StatusChange)
    }
  }

  private onPlay = () => {
    this.status = AudioControllerStatus.Playing
    this.callListeners(AudioControllerEventName.StatusChange)
  }

  private onPause = () => {
    this.status = AudioControllerStatus.Idle
    this.callListeners(AudioControllerEventName.StatusChange)
  }
}

export default new AudioController()
