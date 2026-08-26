/**
 * Génération des lits de bruit.
 *
 * Un buffer bouclé sur lui-même claque à la jointure dès que le signal est
 * fortement passe-bas (cas du bruit brun) : l'échantillon de fin et celui de
 * début ne se rejoignent pas. On fond donc la queue dans la tête sur ~80 ms,
 * et on borne la boucle juste avant la zone fondue (`loopEnd`).
 */

export type GeneratedNoise = "white" | "pink" | "brown";

const SEAM_SECONDS = 0.08;

function removeDc(data: Float32Array) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const mean = sum / data.length;
  for (let i = 0; i < data.length; i++) data[i] -= mean;
}

function normalize(data: Float32Array, peak: number) {
  let max = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > max) max = abs;
  }
  if (max === 0) return;
  const gain = peak / max;
  for (let i = 0; i < data.length; i++) data[i] *= gain;
}

/** Fond la queue dans la tête pour que la boucle soit continue. */
function crossfadeSeam(data: Float32Array, seam: number) {
  const len = data.length;
  if (seam <= 0 || seam * 2 >= len) return;
  for (let i = 0; i < seam; i++) {
    const t = i / seam;
    data[i] = data[i] * t + data[len - seam + i] * (1 - t);
  }
}

function fillWhite(data: Float32Array) {
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

/** Bruit rose — approximation de Paul Kellet (filtre à 7 pôles). */
function fillPink(data: Float32Array) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
}

/** Bruit brun — intégration du bruit blanc avec fuite (évite la dérive DC). */
function fillBrown(data: Float32Array) {
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    data[i] = last * 3.5;
  }
}

export interface NoiseBuffer {
  buffer: AudioBuffer;
  /** Fin de boucle en secondes, avant la zone de fondu. */
  loopEnd: number;
}

export function createNoiseBuffer(
  ctx: BaseAudioContext,
  color: GeneratedNoise,
  seconds = 6,
): NoiseBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);

  if (color === "white") fillWhite(data);
  else if (color === "pink") fillPink(data);
  else fillBrown(data);

  removeDc(data);
  normalize(data, 0.9);

  const seam = Math.floor(rate * SEAM_SECONDS);
  crossfadeSeam(data, seam);

  return { buffer, loopEnd: (length - seam) / rate };
}
