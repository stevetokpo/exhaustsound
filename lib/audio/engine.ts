import { getHub, ramp } from "./hub";
import { createNoiseBuffer, type GeneratedNoise } from "./noise";
import {
  DEFAULT_SETTINGS,
  type EngineSettings,
  type NoiseColor,
  type ToneMode,
  type Waveform,
} from "./types";

/** Lissage générique appliqué à tout changement de paramètre en direct. */
const RAMP = 0.06;
/** Enveloppe propre au module : le fondu de séance, lui, vit sur le bus. */
const MODULE_FADE = 0.05;

interface Graph {
  out: GainNode;
  toneGain: GainNode;
  modGain: GainNode;
  merger: ChannelMergerNode;
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  gAL: GainNode;
  gAR: GainNode;
  gBR: GainNode;
  lfo: OscillatorNode;
  lfoShape: BiquadFilterNode;
  lfoDepth: GainNode;
  noiseGain: GainNode;
  noiseFilter: BiquadFilterNode;
  noiseSrc: AudioBufferSourceNode | null;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Générateur de porteuse et de bruit. Ne gère ni le volume général ni le
 * fondu de séance : il produit un signal et le pose sur le bus partagé,
 * où il se mélange à la piste de fond.
 */
export class ToneEngine {
  private ctx: AudioContext | null = null;
  private graph: Graph | null = null;
  private settings: EngineSettings = { ...DEFAULT_SETTINGS };
  private waveDipTimeout: number | null = null;

  isRunning(): boolean {
    return this.graph !== null;
  }

  getSettings(): EngineSettings {
    return { ...this.settings };
  }

  private ramp(param: AudioParam, value: number, seconds = RAMP) {
    if (!this.ctx) return;
    ramp(this.ctx, param, value, seconds);
  }

  // ------------------------------------------------------------------ graphe

  private buildGraph(): Graph {
    const { ctx, bus } = getHub();
    this.ctx = ctx;
    const s = this.settings;

    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(bus);

    const toneGain = ctx.createGain();
    toneGain.gain.value = s.toneLevel;
    toneGain.connect(out);

    const modGain = ctx.createGain();
    modGain.connect(toneGain);

    const merger = ctx.createChannelMerger(2);
    merger.connect(modGain);

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = s.waveform;
    oscB.type = s.waveform;

    const gAL = ctx.createGain();
    const gAR = ctx.createGain();
    const gBR = ctx.createGain();
    oscA.connect(gAL).connect(merger, 0, 0);
    oscA.connect(gAR).connect(merger, 0, 1);
    oscB.connect(gBR).connect(merger, 0, 1);

    // LFO de modulation d'amplitude (isochrone / trémolo).
    const lfo = ctx.createOscillator();
    const lfoShape = ctx.createBiquadFilter();
    lfoShape.type = "lowpass";
    lfoShape.Q.value = 0.7;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0;
    lfo.connect(lfoShape).connect(lfoDepth).connect(modGain.gain);

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.Q.value = 0.7;
    noiseFilter.frequency.value = s.noiseTone;
    noiseFilter.connect(noiseGain).connect(out);

    oscA.start();
    oscB.start();
    lfo.start();

    const graph: Graph = {
      out, toneGain, modGain, merger,
      oscA, oscB, gAL, gAR, gBR,
      lfo, lfoShape, lfoDepth,
      noiseGain, noiseFilter, noiseSrc: null,
    };

    this.applyRouting(graph, 0);
    this.applyFrequencies(graph, 0);
    this.applyModulation(graph, 0);
    this.applyNoise(graph, true);
    return graph;
  }

  private teardown(g: Graph) {
    const stopSafely = (node: AudioScheduledSourceNode | null) => {
      if (!node) return;
      try { node.stop(); } catch { /* déjà arrêté */ }
      try { node.disconnect(); } catch { /* déjà détaché */ }
    };
    stopSafely(g.oscA);
    stopSafely(g.oscB);
    stopSafely(g.lfo);
    stopSafely(g.noiseSrc);
    try { g.out.disconnect(); } catch { /* déjà détaché */ }
  }

  // ------------------------------------------------------ application réglages

  /** Aiguillage stéréo : en binaural chaque oreille reçoit sa porteuse,
   *  sinon la même porteuse est centrée sur les deux canaux. */
  private applyRouting(g: Graph, seconds = RAMP) {
    const binaural = this.settings.mode === "binaural";
    this.ramp(g.gAL.gain, 1, seconds);
    this.ramp(g.gAR.gain, binaural ? 0 : 1, seconds);
    this.ramp(g.gBR.gain, binaural ? 1 : 0, seconds);
  }

  private applyFrequencies(g: Graph, seconds = RAMP) {
    const { frequency, beat, mode } = this.settings;
    const half = mode === "binaural" ? beat / 2 : 0;
    this.ramp(g.oscA.frequency, Math.max(1, frequency - half), seconds);
    this.ramp(g.oscB.frequency, Math.max(1, frequency + beat / 2), seconds);
  }

  private applyModulation(g: Graph, seconds = RAMP) {
    const { mode, beat, depth } = this.settings;

    // En binaural le battement naît de l'interférence entre les deux
    // oreilles : toute modulation d'amplitude en plus serait redondante.
    const active = mode === "isochronic" || (mode === "pure" && depth > 0);
    const d = active ? clamp(depth, 0, 1) : 0;

    if (mode === "isochronic") {
      g.lfo.type = "square";
      // On arrondit les fronts du carré : des impulsions franches
      // produiraient un clic à chaque battement.
      this.ramp(g.lfoShape.frequency, clamp(beat * 8, 12, 400), seconds);
    } else {
      g.lfo.type = "sine";
      this.ramp(g.lfoShape.frequency, 2000, seconds);
    }

    this.ramp(g.lfo.frequency, clamp(beat, 0.1, 200), seconds);
    // gain résultant = (1 - d/2) + lfo(-1..1) * (d/2)  →  varie entre 1-d et 1
    this.ramp(g.lfoDepth.gain, d / 2, seconds);
    this.ramp(g.modGain.gain, 1 - d / 2, seconds);
  }

  private applyNoise(g: Graph, rebuild: boolean) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { noise, noiseLevel, noiseTone } = this.settings;

    if (rebuild) {
      if (g.noiseSrc) {
        try { g.noiseSrc.stop(); } catch { /* déjà arrêté */ }
        try { g.noiseSrc.disconnect(); } catch { /* déjà détaché */ }
        g.noiseSrc = null;
      }
      if (noise !== "off") {
        const { buffer, loopEnd } = createNoiseBuffer(ctx, noise as GeneratedNoise);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.loopStart = 0;
        src.loopEnd = loopEnd;
        src.connect(g.noiseFilter);
        src.start();
        g.noiseSrc = src;
      }
    }

    this.ramp(g.noiseFilter.frequency, clamp(noiseTone, 100, 18000));
    this.ramp(g.noiseGain.gain, noise === "off" ? 0 : noiseLevel * 0.6);
  }

  // ------------------------------------------------------------------ contrôle

  start() {
    if (this.graph) return;
    this.graph = this.buildGraph();
    this.ramp(this.graph.out.gain, 1, MODULE_FADE);
  }

  /** Arrêt immédiat. Le fondu de séance est appliqué en amont, sur le bus. */
  stop() {
    const g = this.graph;
    if (!g) return;
    this.graph = null;
    this.teardown(g);
  }

  // ------------------------------------------------------------------ setters

  setFrequency(value: number) {
    this.settings.frequency = value;
    if (this.graph) this.applyFrequencies(this.graph);
  }

  setWaveform(value: Waveform) {
    this.settings.waveform = value;
    const g = this.graph;
    if (!g) return;
    // Changer de forme d'onde crée une discontinuité : on creuse
    // brièvement le niveau pour que la transition reste inaudible.
    const level = this.settings.toneLevel;
    this.ramp(g.toneGain.gain, 0, 0.025);
    if (this.waveDipTimeout !== null) window.clearTimeout(this.waveDipTimeout);
    this.waveDipTimeout = window.setTimeout(() => {
      this.waveDipTimeout = null;
      if (this.graph !== g) return;
      g.oscA.type = value;
      g.oscB.type = value;
      this.ramp(g.toneGain.gain, level, 0.07);
    }, 30);
  }

  setMode(value: ToneMode) {
    this.settings.mode = value;
    const g = this.graph;
    if (!g) return;
    this.applyRouting(g, 0.09);
    this.applyFrequencies(g, 0.09);
    this.applyModulation(g, 0.09);
  }

  setBeat(value: number) {
    this.settings.beat = value;
    if (this.graph) {
      this.applyFrequencies(this.graph);
      this.applyModulation(this.graph);
    }
  }

  setDepth(value: number) {
    this.settings.depth = value;
    if (this.graph) this.applyModulation(this.graph);
  }

  setToneLevel(value: number) {
    this.settings.toneLevel = value;
    if (this.graph && this.waveDipTimeout === null) {
      this.ramp(this.graph.toneGain.gain, value);
    }
  }

  setNoise(value: NoiseColor) {
    const changed = this.settings.noise !== value;
    this.settings.noise = value;
    if (this.graph) this.applyNoise(this.graph, changed);
  }

  setNoiseLevel(value: number) {
    this.settings.noiseLevel = value;
    if (this.graph) this.applyNoise(this.graph, false);
  }

  setNoiseTone(value: number) {
    this.settings.noiseTone = value;
    if (this.graph) this.applyNoise(this.graph, false);
  }

  /** Applique un preset d'un coup. `master` n'est pas traité ici :
   *  le volume général appartient au mélangeur, pas au générateur. */
  applyPreset(partial: Partial<EngineSettings>) {
    const previousWave = this.settings.waveform;
    this.settings = { ...this.settings, ...partial };
    const g = this.graph;
    if (!g) return;
    if (partial.waveform && partial.waveform !== previousWave) {
      this.setWaveform(partial.waveform);
    }
    this.applyRouting(g, 0.12);
    this.applyFrequencies(g, 0.12);
    this.applyModulation(g, 0.12);
    this.applyNoise(g, partial.noise !== undefined);
    this.ramp(g.toneGain.gain, this.settings.toneLevel, 0.12);
  }

  dispose() {
    if (this.waveDipTimeout !== null) window.clearTimeout(this.waveDipTimeout);
    this.stop();
  }
}
