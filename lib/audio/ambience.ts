import { getHub, ramp } from "./hub";
import { createNoiseBuffer, type GeneratedNoise } from "./noise";
import type { AmbienceId } from "./types";

/**
 * Ambiances naturelles synthétisées.
 *
 * Rien n'est enregistré ni téléchargé : chaque ambiance est construite à
 * partir de bruit filtré et d'événements ponctuels programmés au hasard.
 * Trois raisons à ce choix plutôt que des fichiers audio :
 *
 *  — aucun octet à héberger, donc aucune bande passante consommée ;
 *  — aucune question de droits sur des enregistrements ;
 *  — aucune boucle. Une pluie enregistrée finit toujours par se répéter de
 *    façon audible ; ici la texture ne se reproduit jamais à l'identique.
 *
 * Les événements (gouttes, craquements, tonnerre, stridulations) sont
 * programmés en avance sur l'horloge audio, jamais déclenchés par
 * setTimeout : l'horloge des minuteurs dérive de plusieurs dizaines de
 * millisecondes, ce qui s'entend immédiatement sur des transitoires.
 */

export const AMBIENCE_LABELS: Record<AmbienceId, string> = {
  pluie: "Pluie fine",
  averse: "Averse",
  orage: "Orage lointain",
  vent: "Vent",
  vagues: "Vagues",
  ruisseau: "Ruisseau",
  feu: "Feu de bois",
  grillons: "Grillons",
};

export const AMBIENCE_HINTS: Record<AmbienceId, string> = {
  pluie: "Pluie régulière et fine, sans grave. La plus neutre pour dormir.",
  averse: "Pluie dense avec du corps dans le bas. Masque bien une pièce bruyante.",
  orage: "Pluie soutenue et roulements de tonnerre espacés.",
  vent: "Souffle continu dont le timbre se déplace lentement.",
  vagues: "Ressac lent, montée rapide et retrait long. Environ six vagues par minute.",
  ruisseau: "Filet d'eau clair, avec des gargouillis irréguliers.",
  feu: "Braises sourdes et craquements secs.",
  grillons: "Nuit d'été. Stridulations décalées de quelques individus.",
};

/** Portée de programmation en avance, en secondes. */
const LOOKAHEAD = 0.4;
const TICK_MS = 150;
const LEVEL_RAMP = 0.12;

interface Layer {
  source: AudioBufferSourceNode;
  nodes: AudioNode[];
  gain: GainNode;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export class AmbienceEngine {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private toneFilter: BiquadFilterNode | null = null;
  private layers: Layer[] = [];
  private buffers = new Map<GeneratedNoise, { buffer: AudioBuffer; loopEnd: number }>();

  private id: AmbienceId | null = null;
  private level = 0.45;
  private tone = 9000;

  private timer: number | null = null;
  private swapTimeout: number | null = null;
  private nextEventAt = 0;
  /** Filtre de la vague en cours, piloté par automation. */
  private waveFilter: BiquadFilterNode | null = null;
  private waveGain: GainNode | null = null;

  getId(): AmbienceId | null {
    return this.id;
  }

  isRunning(): boolean {
    return this.out !== null;
  }

  // ------------------------------------------------------------------ helpers

  private noise(color: GeneratedNoise) {
    const ctx = this.ctx!;
    let cached = this.buffers.get(color);
    if (!cached) {
      cached = createNoiseBuffer(ctx, color);
      this.buffers.set(color, cached);
    }
    return cached;
  }

  /** Nappe continue : bruit bouclé traversant une chaîne de filtres. */
  private bed(
    color: GeneratedNoise,
    filters: BiquadFilterNode[],
    gainValue: number,
  ): Layer {
    const ctx = this.ctx!;
    const { buffer, loopEnd } = this.noise(color);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = loopEnd;

    const gain = ctx.createGain();
    gain.gain.value = gainValue;

    let node: AudioNode = source;
    for (const filter of filters) node = node.connect(filter);
    node.connect(gain).connect(this.toneFilter!);
    source.start();

    const layer: Layer = { source, nodes: filters, gain };
    this.layers.push(layer);
    return layer;
  }

  private filter(
    type: BiquadFilterType,
    frequency: number,
    q = 0.7,
  ): BiquadFilterNode {
    const filter = this.ctx!.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }

  /** Oscillation très lente d'un paramètre : évite qu'une nappe continue
   *  ne devienne un mur statique au bout de quelques minutes. */
  private drift(param: AudioParam, center: number, spread: number, periodSec: number) {
    const ctx = this.ctx!;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1 / periodSec;
    const depth = ctx.createGain();
    depth.gain.value = spread;
    param.value = center;
    lfo.connect(depth).connect(param);
    lfo.start();
    this.layers.push({
      source: lfo as unknown as AudioBufferSourceNode,
      nodes: [depth],
      gain: depth,
    });
  }

  /** Événement bref : salve de bruit filtrée avec une enveloppe percussive. */
  private burst(
    time: number,
    color: GeneratedNoise,
    type: BiquadFilterType,
    frequency: number,
    q: number,
    peak: number,
    attack: number,
    decay: number,
  ) {
    const ctx = this.ctx!;
    const { buffer } = this.noise(color);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // Point de départ aléatoire : deux salves ne piochent jamais la même
    // portion de bruit, sinon l'oreille reconnaît le motif.
    const offset = Math.random() * Math.max(0.01, buffer.duration - 0.5);

    const filter = this.filter(type, frequency, q);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + attack);
    gain.gain.setTargetAtTime(0, time + attack, decay / 3);

    source.connect(filter).connect(gain).connect(this.toneFilter!);
    source.start(time, offset);
    const stopAt = time + attack + decay;
    source.stop(stopAt);
    source.onended = () => {
      try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch { /* déjà détaché */ }
    };
  }

  /** Stridulation : porteuse aiguë hachée par un train d'impulsions. */
  private chirp(time: number) {
    const ctx = this.ctx!;
    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = rand(4100, 4900);

    const pulse = ctx.createOscillator();
    pulse.type = "square";
    pulse.frequency.value = rand(22, 30);
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    pulse.connect(pulseDepth).connect(gain.gain);

    const envelope = ctx.createGain();
    const duration = rand(0.15, 0.32);
    const peak = rand(0.05, 0.11);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.linearRampToValueAtTime(peak, time + 0.04);
    envelope.gain.setValueAtTime(peak, time + duration - 0.05);
    envelope.gain.linearRampToValueAtTime(0.0001, time + duration);

    carrier.connect(gain).connect(envelope).connect(this.toneFilter!);
    carrier.start(time);
    pulse.start(time);
    carrier.stop(time + duration);
    pulse.stop(time + duration);
    carrier.onended = () => {
      try {
        carrier.disconnect(); pulse.disconnect();
        pulseDepth.disconnect(); gain.disconnect(); envelope.disconnect();
      } catch { /* déjà détaché */ }
    };
  }

  /** Une vague : montée rapide, retrait long, sur le timbre et le niveau. */
  private wave(time: number, period: number) {
    const filter = this.waveFilter;
    const gain = this.waveGain;
    if (!filter || !gain) return;
    const rise = period * 0.28;

    filter.frequency.cancelScheduledValues(time);
    filter.frequency.setValueAtTime(300, time);
    filter.frequency.linearRampToValueAtTime(rand(1800, 2400), time + rise);
    filter.frequency.linearRampToValueAtTime(300, time + period);

    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.linearRampToValueAtTime(rand(0.7, 0.95), time + rise);
    gain.gain.linearRampToValueAtTime(0.12, time + period);
  }

  // ------------------------------------------------------------- construction

  private build(id: AmbienceId) {
    switch (id) {
      case "pluie": {
        const bed = this.bed("pink", [
          this.filter("highpass", 750),
          this.filter("lowpass", 9000),
        ], 0.55);
        this.drift(bed.gain.gain, 0.55, 0.07, 17);
        break;
      }
      case "averse": {
        const bed = this.bed("pink", [
          this.filter("highpass", 320),
          this.filter("lowpass", 7500),
        ], 0.8);
        this.drift(bed.gain.gain, 0.8, 0.1, 13);
        // Sous-couche sourde : c'est elle qui donne le poids d'une vraie averse.
        this.bed("brown", [this.filter("lowpass", 260)], 0.3);
        break;
      }
      case "orage": {
        const bed = this.bed("pink", [
          this.filter("highpass", 420),
          this.filter("lowpass", 8000),
        ], 0.65);
        this.drift(bed.gain.gain, 0.65, 0.08, 15);
        this.bed("brown", [this.filter("lowpass", 200)], 0.22);
        break;
      }
      case "vent": {
        // Deux bandes aux périodes différentes : leur déphasage empêche le
        // souffle de retomber sur un cycle reconnaissable.
        const a = this.filter("bandpass", 400, 1.1);
        const bedA = this.bed("pink", [a, this.filter("lowpass", 5000)], 0.75);
        this.drift(a.frequency, 460, 280, 11);
        this.drift(bedA.gain.gain, 0.7, 0.28, 9);

        const b = this.filter("bandpass", 260, 1.4);
        const bedB = this.bed("brown", [b], 0.5);
        this.drift(b.frequency, 300, 180, 17);
        this.drift(bedB.gain.gain, 0.45, 0.2, 14);
        break;
      }
      case "vagues": {
        const filter = this.filter("lowpass", 300, 0.9);
        const layer = this.bed("pink", [filter], 0.12);
        this.waveFilter = filter;
        this.waveGain = layer.gain;
        break;
      }
      case "ruisseau": {
        this.bed("white", [
          this.filter("highpass", 950),
          this.filter("lowpass", 6500),
        ], 0.34);
        break;
      }
      case "feu": {
        const bed = this.bed("brown", [this.filter("lowpass", 900)], 0.5);
        this.drift(bed.gain.gain, 0.5, 0.08, 12);
        break;
      }
      case "grillons": {
        this.bed("brown", [this.filter("lowpass", 380)], 0.14);
        break;
      }
    }
  }

  /** Délai jusqu'au prochain événement, propre à chaque ambiance. */
  private nextInterval(): number {
    switch (this.id) {
      case "pluie": return rand(0.035, 0.09);
      case "averse": return rand(0.018, 0.045);
      case "orage": return rand(0.03, 0.08);
      case "ruisseau": return rand(0.06, 0.17);
      case "feu": return rand(0.1, 0.42);
      case "grillons": return rand(0.5, 1.9);
      case "vagues": return rand(9, 14);
      default: return 1;
    }
  }

  private scheduleEvent(time: number) {
    switch (this.id) {
      case "pluie":
        this.burst(time, "white", "bandpass", rand(1600, 4200), 3.5, rand(0.02, 0.06), 0.001, 0.02);
        break;
      case "averse":
        this.burst(time, "white", "bandpass", rand(1100, 3600), 3, rand(0.02, 0.07), 0.001, 0.025);
        break;
      case "orage":
        this.burst(time, "white", "bandpass", rand(1400, 3800), 3.5, rand(0.02, 0.055), 0.001, 0.02);
        // Roulement lointain, rare : c'est l'espacement qui le rend crédible.
        if (Math.random() < 0.0016) {
          this.burst(time, "brown", "lowpass", rand(85, 160), 0.6, rand(0.5, 0.95), rand(0.25, 0.6), rand(3.5, 7));
        }
        break;
      case "ruisseau":
        this.burst(time, "white", "bandpass", rand(500, 1900), 6, rand(0.04, 0.11), 0.006, rand(0.04, 0.1));
        break;
      case "feu":
        this.burst(time, "white", "bandpass", rand(900, 3200), 5, rand(0.05, 0.18), 0.001, rand(0.01, 0.035));
        break;
      case "grillons":
        this.chirp(time);
        break;
      case "vagues":
        this.wave(time, rand(9, 14));
        break;
      default:
        break;
    }
  }

  private tick = () => {
    const ctx = this.ctx;
    if (!ctx || !this.id) return;
    const horizon = ctx.currentTime + LOOKAHEAD;
    let guard = 0;
    while (this.nextEventAt < horizon && guard < 200) {
      this.scheduleEvent(Math.max(this.nextEventAt, ctx.currentTime));
      this.nextEventAt += this.nextInterval();
      guard += 1;
    }
  };

  // ------------------------------------------------------------------ contrôle

  private attach() {
    if (this.out) return;
    const { ctx, bus } = getHub();
    this.ctx = ctx;

    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(bus);

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = "lowpass";
    toneFilter.Q.value = 0.7;
    toneFilter.frequency.value = this.tone;
    toneFilter.connect(out);

    this.out = out;
    this.toneFilter = toneFilter;
  }

  private detach() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    for (const layer of this.layers) {
      try { layer.source.stop(); } catch { /* déjà arrêté */ }
      try { layer.source.disconnect(); } catch { /* déjà détaché */ }
      for (const node of layer.nodes) {
        try { node.disconnect(); } catch { /* déjà détaché */ }
      }
      try { layer.gain.disconnect(); } catch { /* déjà détaché */ }
    }
    this.layers = [];
    this.waveFilter = null;
    this.waveGain = null;
    try { this.toneFilter?.disconnect(); } catch { /* déjà détaché */ }
    try { this.out?.disconnect(); } catch { /* déjà détaché */ }
    this.toneFilter = null;
    this.out = null;
  }

  start() {
    if (!this.id || this.out) return;
    this.attach();
    this.build(this.id);
    this.nextEventAt = this.ctx!.currentTime + 0.05;
    this.tick();
    this.timer = window.setInterval(this.tick, TICK_MS);
    ramp(this.ctx!, this.out!.gain, this.level, LEVEL_RAMP);
  }

  stop() {
    this.clearSwap();
    this.detach();
  }

  private clearSwap() {
    if (this.swapTimeout === null) return;
    window.clearTimeout(this.swapTimeout);
    this.swapTimeout = null;
  }

  setAmbience(id: AmbienceId | null, running: boolean) {
    if (id === this.id) return;
    this.id = id;
    this.clearSwap();

    if (!running) {
      this.detach();
      return;
    }

    // Couper une nappe en cours produit un clic franc. On la ferme sur
    // 150 ms avant de démonter et de construire la suivante.
    if (this.out && this.ctx) {
      ramp(this.ctx, this.out.gain, 0, 0.15);
      this.swapTimeout = window.setTimeout(() => {
        this.swapTimeout = null;
        this.detach();
        if (this.id) this.start();
      }, 190);
      return;
    }

    this.detach();
    if (id) this.start();
  }

  setLevel(value: number) {
    this.level = value;
    if (this.out && this.ctx) ramp(this.ctx, this.out.gain, value, LEVEL_RAMP);
  }

  setTone(value: number) {
    this.tone = value;
    if (this.toneFilter && this.ctx) ramp(this.ctx, this.toneFilter.frequency, value, LEVEL_RAMP);
  }

  dispose() {
    this.clearSwap();
    this.detach();
    this.buffers.clear();
    this.id = null;
  }
}
