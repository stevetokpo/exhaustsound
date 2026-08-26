import { NextResponse } from "next/server";
import {
  AUDIO_RESOURCE_TYPE, LIBRARY_FOLDER, LIBRARY_TAG,
  MISSING_CONFIG_MESSAGE, getCloudinary, readConfig,
} from "@/lib/library/cloudinary";
import { isTrackCategory, sanitizeTitle } from "@/lib/library/types";

export const runtime = "nodejs";

/**
 * Rend la liste complète des paramètres signés que le navigateur devra
 * reposter tels quels. Le secret d'API ne quitte jamais le serveur, et le
 * fichier ne transite jamais par une fonction : il part du navigateur
 * directement vers Cloudinary.
 */
export async function POST(request: Request) {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: MISSING_CONFIG_MESSAGE }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { title, category } = (body ?? {}) as {
    title?: unknown;
    category?: unknown;
  };

  if (typeof title !== "string" || !sanitizeTitle(title)) {
    return NextResponse.json({ error: "Titre manquant." }, { status: 400 });
  }
  if (!isTrackCategory(category)) {
    return NextResponse.json({ error: "Catégorie inconnue." }, { status: 400 });
  }

  const cld = getCloudinary(config);
  const timestamp = Math.round(Date.now() / 1000);

  // Tout paramètre envoyé à Cloudinary doit figurer dans la signature,
  // sinon l'upload est rejeté. On les génère donc ici, pas côté client.
  const signedParams = {
    context: `title=${sanitizeTitle(title)}|category=${category}`,
    folder: LIBRARY_FOLDER,
    tags: `${LIBRARY_TAG},${category}`,
    timestamp,
  };

  const signature = cld.utils.api_sign_request(signedParams, config.apiSecret);

  return NextResponse.json({
    ...signedParams,
    signature,
    apiKey: config.apiKey,
    endpoint: `https://api.cloudinary.com/v1_1/${config.cloudName}/${AUDIO_RESOURCE_TYPE}/upload`,
  });
}
