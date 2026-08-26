import { ToneEngine } from "./engine";
import { AmbienceEngine } from "./ambience";
import { TrackChannel } from "./trackChannel";
import { busGainFor, peekHub, ramp, resumeHub } from "./hub";
import { DEFAULT_SETTINGS, type EngineSettings } from "./types";

export type SessionState = "idle" | "playing" | "fading";

const FADE_IN = 1.4;
const FADE_OUT = 0.7;

/**
 * Chef d'orchestre de la séance. Il possède le volume général et le fondu :
 * les deux vivent sur le bus partagé, donc un seul fondu suffit à couvrir la
 * porteuse, le bruit et la piste de fond en même temps.
 */
export class SessionMixer {
  readonly tone = new ToneEngine();
  readonly ambience = new AmbienceEngine();
  readonly track = new TrackChannel();

  private state: SessionState = "idle";
  private master = DEFAULT_SETTINGS.master;
  private fadeTimeout: number | null = null;

  onStateChange: ((state: SessionState) => void) | null = null;

  getState(): SessionState {
    return this.state;
  }

  private setState(next: SessionState) {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange?.(next);
  }

  private cancelPendingFade() {
    if (this.fadeTimeout === null) return;
    window.clearTimeout(this.fadeTimeout);
    this.fadeTimeout = null;
    this.tone.stop();
    this.ambience.stop();
    this.track.pause();
    this.setState("idle");
  }

  async start() {
    // Un démarrage pendant le fondu de sortie repart proprement à zéro.
    this.cancelPendingFade();
    if (this.state === "playing") return;

    const { ctx, bus } = await resumeHub();
    this.tone.start();
    this.ambience.start();
    void this.track.play();
    ramp(ctx, bus.gain, busGainFor(this.master), FADE_IN);
    this.setState("playing");
  }

  /** `seconds` sert aussi au fondu de fin de minuteur. */
  stop(seconds = FADE_OUT) {
    if (this.state !== "playing") return;
    const hub = peekHub();
    if (!hub) return;

    this.setState("fading");
    ramp(hub.ctx, hub.bus.gain, 0, seconds);

    this.fadeTimeout = window.setTimeout(() => {
      this.fadeTimeout = null;
      this.tone.stop();
      this.ambience.stop();
      this.track.pause();
      this.setState("idle");
    }, seconds * 1000 + 120);
  }

  setMaster(value: number) {
    this.master = value;
    const hub = peekHub();
    if (hub && this.state === "playing") {
      ramp(hub.ctx, hub.bus.gain, busGainFor(value), 0.12);
    }
  }

  applyPreset(partial: Partial<EngineSettings>) {
    this.tone.applyPreset(partial);
    if (partial.ambience !== undefined) {
      this.ambience.setAmbience(
        partial.ambience === "off" ? null : partial.ambience,
        this.state === "playing",
      );
    }
    if (partial.noiseLevel !== undefined) this.ambience.setLevel(partial.noiseLevel);
    if (partial.noiseTone !== undefined) this.ambience.setTone(partial.noiseTone);
    if (partial.master !== undefined) this.setMaster(partial.master);
  }

  getAnalyser(): AnalyserNode | null {
    return peekHub()?.analyser ?? null;
  }

  dispose() {
    if (this.fadeTimeout !== null) window.clearTimeout(this.fadeTimeout);
    this.fadeTimeout = null;
    this.tone.dispose();
    this.ambience.dispose();
    this.track.dispose();
    this.state = "idle";
  }
}
