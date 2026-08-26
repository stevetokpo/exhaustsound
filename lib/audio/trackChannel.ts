import { getHub, ramp } from "./hub";

const RAMP = 0.08;

/**
 * Piste de fond branchée sur le bus partagé.
 *
 * L'élément <audio> est créé en JavaScript plutôt que rendu par React :
 * `createMediaElementSource` ne peut être appelé qu'une seule fois par
 * élément et le lien est définitif. Changer de piste impose donc de
 * fabriquer un nouvel élément, ce qui serait ingérable en JSX.
 *
 * Le lecteur de la bibliothèque, lui, reste sur un <audio> ordinaire non
 * routé : c'est là que la lecture en arrière-plan compte, et la traverser
 * par Web Audio la fragiliserait sans rien apporter.
 */
export class TrackChannel {
  private audio: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private url: string | null = null;
  private level = 0.5;
  private loop = true;

  onTime: ((position: number, duration: number) => void) | null = null;
  onEnded: (() => void) | null = null;

  getUrl(): string | null {
    return this.url;
  }

  hasTrack(): boolean {
    return this.audio !== null;
  }

  load(url: string | null) {
    if (url === this.url) return;
    this.release();
    this.url = url;
    if (!url) return;

    const { ctx, bus } = getHub();
    const audio = new Audio();
    // À poser avant `src` : sans en-tête CORS accepté, le graphe ne reçoit
    // que du silence. Cloudinary sert bien `Access-Control-Allow-Origin`.
    audio.crossOrigin = "anonymous";
    audio.loop = this.loop;
    audio.preload = "auto";
    audio.src = url;

    audio.addEventListener("timeupdate", () => {
      this.onTime?.(audio.currentTime, audio.duration || 0);
    });
    audio.addEventListener("ended", () => this.onEnded?.());

    const gain = ctx.createGain();
    gain.gain.value = this.level;
    const source = ctx.createMediaElementSource(audio);
    source.connect(gain).connect(bus);

    this.audio = audio;
    this.source = source;
    this.gain = gain;
  }

  private release() {
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute("src");
      this.audio.load();
    }
    try { this.source?.disconnect(); } catch { /* déjà détaché */ }
    try { this.gain?.disconnect(); } catch { /* déjà détaché */ }
    this.audio = null;
    this.source = null;
    this.gain = null;
    this.url = null;
  }

  async play() {
    if (!this.audio) return;
    try {
      await this.audio.play();
    } catch {
      // Refusé par la politique d'autoplay : l'utilisateur relancera.
    }
  }

  pause() {
    this.audio?.pause();
  }

  seek(seconds: number) {
    if (this.audio) this.audio.currentTime = seconds;
  }

  setLevel(value: number) {
    this.level = value;
    const gain = this.gain;
    if (!gain) return;
    ramp(getHub().ctx, gain.gain, value, RAMP);
  }

  setLoop(value: boolean) {
    this.loop = value;
    if (this.audio) this.audio.loop = value;
  }

  dispose() {
    this.release();
  }
}
