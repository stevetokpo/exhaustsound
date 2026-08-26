/**
 * Bus audio unique de l'application.
 *
 * Un navigateur limite le nombre d'AudioContext qu'une page peut ouvrir, et
 * surtout : deux contextes distincts ne peuvent pas être mélangés ni fondus
 * ensemble. Tout ce qui produit du son ici — porteuse, bruit, piste de fond —
 * se branche donc sur le même bus, ce qui rend possible un fondu de séance
 * qui les couvre tous d'un coup.
 *
 *   [porteuse + bruit] ─┐
 *                       ├→ bus → limiteur → analyseur → sortie
 *   [piste de fond] ────┘
 */

/** Réserve de marge avant le limiteur. On ne sort jamais à 0 dBFS. */
const MAX_OUTPUT = 0.85;

export interface AudioHub {
  ctx: AudioContext;
  /** Point de branchement commun, et volume général de la séance. */
  bus: GainNode;
  analyser: AnalyserNode;
}

let hub: AudioHub | null = null;

export function getHub(): AudioHub {
  if (hub) return hub;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new Ctor();

  const bus = ctx.createGain();
  bus.gain.value = 0; // le fondu d'entrée part toujours du silence

  // Filet de sécurité sur la somme : la piste et la porteuse peuvent
  // s'additionner au-delà de ce que chacune produit seule.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.82;

  bus.connect(limiter);
  limiter.connect(analyser);
  analyser.connect(ctx.destination);

  hub = { ctx, bus, analyser };
  return hub;
}

/** Rend le bus sans le créer : pour les lectures qui ne doivent pas
 *  déclencher l'ouverture d'un contexte (l'analyseur du visualiseur). */
export function peekHub(): AudioHub | null {
  return hub;
}

export async function resumeHub(): Promise<AudioHub> {
  const current = getHub();
  // Obligatoire : un contexte ne démarre qu'à la suite d'un geste utilisateur.
  if (current.ctx.state === "suspended") await current.ctx.resume();
  return current;
}

/**
 * Toute modification de gain passe par ici. Poser directement `param.value`
 * en cours de lecture produit un craquement audible à chaque mouvement.
 */
export function ramp(
  ctx: BaseAudioContext,
  param: AudioParam,
  value: number,
  seconds: number,
) {
  const now = ctx.currentTime;
  param.cancelScheduledValues(now);
  // Une rampe de durée nulle n'est pas fiable d'un moteur à l'autre :
  // à la construction du graphe on pose la valeur directement.
  if (seconds <= 0) {
    param.setValueAtTime(value, now);
    return;
  }
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
}

/** Courbe perceptuelle : le curseur doit « sonner » linéaire à l'oreille. */
export function busGainFor(volume: number): number {
  return MAX_OUTPUT * volume ** 2;
}
