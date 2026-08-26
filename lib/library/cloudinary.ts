import { v2 as cloudinary } from "cloudinary";

/** Toutes les ressources déposées par l'app portent cette étiquette :
 *  c'est elle, et non un dossier, qui sert de critère de recherche —
 *  le comportement des dossiers varie selon la configuration du compte. */
export const LIBRARY_TAG = "exhaustsound";
export const LIBRARY_FOLDER = "exhaustsound";

/** Cloudinary range l'audio sous `video`. Ce n'est pas une erreur :
 *  c'est le même pipeline de traitement média des deux côtés. */
export const AUDIO_RESOURCE_TYPE = "video";

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function readConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function getCloudinary(config: CloudinaryConfig) {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  return cloudinary;
}

export const MISSING_CONFIG_MESSAGE =
  "Cloudinary n'est pas configuré. Renseignez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET.";
