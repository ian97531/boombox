import { Store } from 'redux';
import { playerUpdate } from 'store/actions/player';
import { PlayerStatus } from 'store/reducers/player';

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
 * and forwards that information along to the redux store. When a component wishes to update the
 * playing audio it should only ever dispatch actions which will under the hood update the
 * AudioController.
 */
class AudioController {
  private store: Store;
  private audioEl: HTMLAudioElement | null;

  constructor() {
    ['onTimeUpdated', 'onLoadedMetadata', 'onPlay', 'onPause'].forEach(
      method => {
        this[method] = this[method].bind(this);
      },
    );
  }

  public setStore(store: Store) {
    this.store = store;
  }

  public setSrc(src: string) {
    this.createAndLoadAudioElement(src);
  }

  public play() {
    if (this.audioEl) {
      this.audioEl.play();
    }
  }

  public seek(newTime: number) {
    if (this.audioEl) {
      this.audioEl.currentTime = newTime;
      this.play();
    }
  }

  private createAndLoadAudioElement(src: string) {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.removeEventListener('timeupdate', this.onTimeUpdated);
      this.audioEl.removeEventListener('loadedmetadata', this.onLoadedMetadata);
      this.audioEl.removeEventListener('play', this.onPlay);
      this.audioEl.removeEventListener('pause', this.onPause);
      this.audioEl = null;
    }

    this.store.dispatch(playerUpdate({ status: PlayerStatus.Loading }));
    this.audioEl = document.createElement('audio');
    this.audioEl.addEventListener('timeupdate', this.onTimeUpdated);
    this.audioEl.addEventListener('loadedmetadata', this.onLoadedMetadata);
    this.audioEl.addEventListener('play', this.onPlay);
    this.audioEl.addEventListener('pause', this.onPause);
    this.audioEl.src = src;
  }

  private onTimeUpdated(evt: Event) {
    if (this.audioEl) {
      this.store.dispatch(
        playerUpdate({ currentTime: this.audioEl.currentTime }),
      );
    }
  }

  private onLoadedMetadata(evt: Event) {
    if (!this.audioEl) {
      return;
    }
    this.store.dispatch(
      playerUpdate({
        duration: this.audioEl.duration,
        status: PlayerStatus.Idle,
      }),
    );
  }

  private onPlay() {
    this.store.dispatch(
      playerUpdate({
        status: PlayerStatus.Playing,
      }),
    );
  }

  private onPause() {
    this.store.dispatch(playerUpdate({ status: PlayerStatus.Idle }));
  }
}

export default new AudioController();
