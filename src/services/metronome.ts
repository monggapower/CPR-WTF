import { SoundFX } from './sound';

/**
 * MetronomeManager — 110 BPM rhythm guide for AHA standard compressions (100–120 CPM).
 */
export class MetronomeManager {
  private sound: SoundFX;
  public isPlaying: boolean = false;
  public bpm: number = 110.0;
  private timer: number | null = null;
  private onChange?: (playing: boolean) => void;

  constructor(sound: SoundFX, onChange?: (playing: boolean) => void) {
    this.sound = sound;
    this.onChange = onChange;
  }

  setListener(onChange: (playing: boolean) => void) {
    this.onChange = onChange;
  }

  toggle(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const interval = 60000.0 / this.bpm;
    this.timer = window.setInterval(() => {
      this.sound.tick();
    }, interval);
    if (this.onChange) this.onChange(true);
  }

  stop(): void {
    this.isPlaying = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.onChange) this.onChange(false);
  }
}
