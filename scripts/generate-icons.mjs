/**
 * Fabrique le jeu d'icônes de l'application à partir d'un seul dessin
 * vectoriel. sharp est déjà une dépendance de Next (optimisation d'images) :
 * aucun paquet supplémentaire n'est nécessaire.
 *
 *   node scripts/generate-icons.mjs
 *
 * Motif : des ondes concentriques qui rappellent le cercle respiratoire du
 * mode veille. Trois anneaux seulement — au-delà, la lecture se brouille en
 * dessous de 48 px.
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BG_INNER = "#2a2350";
const BG_MID = "#12121d";
const BG_OUTER = "#07070c";
const RING_TOP = "#a396ff";
const RING_BOTTOM = "#6a58e8";

/**
 * @param {object} options
 * @param {number[]} options.radii      rayons des anneaux
 * @param {number[]} options.widths     épaisseurs correspondantes
 * @param {number[]} options.opacities  opacités correspondantes
 * @param {number}   options.dot        rayon du point central
 * @param {number|null} options.corner  arrondi, ou null pour un fond à bord perdu
 */
function buildSvg({ radii, widths, opacities, dot, corner }) {
  const size = 512;
  const c = size / 2;

  const background =
    corner === null
      ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
      : `<rect width="${size}" height="${size}" rx="${corner}" ry="${corner}" fill="url(#bg)"/>`;

  const rings = radii
    .map(
      (r, i) =>
        `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#ring)" ` +
        `stroke-width="${widths[i]}" stroke-opacity="${opacities[i]}"/>`,
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="68%">
      <stop offset="0%" stop-color="${BG_INNER}"/>
      <stop offset="52%" stop-color="${BG_MID}"/>
      <stop offset="100%" stop-color="${BG_OUTER}"/>
    </radialGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${RING_TOP}"/>
      <stop offset="100%" stop-color="${RING_BOTTOM}"/>
    </linearGradient>
  </defs>
  ${background}
    ${rings}
  <circle cx="${c}" cy="${c}" r="${dot}" fill="url(#ring)"/>
</svg>`;
}

/** Variante pleine : l'art occupe ~78 % de la toile. */
const ANY = buildSvg({
  radii: [82, 138, 194],
  widths: [17, 13, 9],
  opacities: [1, 0.62, 0.3],
  dot: 27,
  corner: 112,
});

/**
 * Variante « maskable » : Android recadre en cercle et ne garantit que les
 * 80 % centraux. L'art est donc resserré pour tenir dans la zone sûre,
 * et le fond va jusqu'au bord.
 */
const MASKABLE = buildSvg({
  radii: [66, 112, 158],
  widths: [15, 11, 8],
  opacities: [1, 0.62, 0.3],
  dot: 22,
  corner: null,
});

/** Favicon : deux anneaux épais, seule densité lisible à 16 px. */
const FAVICON = buildSvg({
  radii: [118, 196],
  widths: [40, 26],
  opacities: [1, 0.5],
  dot: 44,
  corner: 96,
});

const OUTPUTS = [
  { svg: ANY, size: 192, file: "public/icons/icon-192.png" },
  { svg: ANY, size: 512, file: "public/icons/icon-512.png" },
  { svg: MASKABLE, size: 192, file: "public/icons/icon-192-maskable.png" },
  { svg: MASKABLE, size: 512, file: "public/icons/icon-512-maskable.png" },
  // iOS applique son propre masque : pas d'arrondi de notre côté, fond à bord perdu.
  { svg: MASKABLE, size: 180, file: "app/apple-icon.png" },
];

await mkdir("public/icons", { recursive: true });

for (const { svg, size, file } of OUTPUTS) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`✓ ${file} (${size}×${size})`);
}

await writeFile("app/icon.svg", `${FAVICON}\n`, "utf8");
console.log("✓ app/icon.svg");
