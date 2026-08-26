import { NextResponse } from "next/server";
import {
  AUDIO_RESOURCE_TYPE, LIBRARY_TAG,
  MISSING_CONFIG_MESSAGE, getCloudinary, readConfig,
} from "@/lib/library/cloudinary";
import { isTrackCategory, type Track, type TrackCategory } from "@/lib/library/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchResource {
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
  created_at: string;
  duration?: number;
  context?: Record<string, unknown>;
}

/** L'API de recherche renvoie le contexte à plat, l'API d'administration
 *  l'imbrique sous `custom`. On accepte les deux formes. */
function readContext(resource: SearchResource): Record<string, unknown> {
  const context = resource.context;
  if (!context) return {};
  const nested = context.custom;
  if (nested && typeof nested === "object") return nested as Record<string, unknown>;
  return context;
}

function toTrack(resource: SearchResource): Track {
  const context = readContext(resource);
  const rawCategory = context.category;
  const category: TrackCategory = isTrackCategory(rawCategory) ? rawCategory : "musique";
  const rawTitle = context.title;

  return {
    publicId: resource.public_id,
    title:
      typeof rawTitle === "string" && rawTitle.trim()
        ? rawTitle
        : resource.public_id.split("/").pop() ?? resource.public_id,
    category,
    url: resource.secure_url,
    duration: typeof resource.duration === "number" ? resource.duration : null,
    bytes: resource.bytes,
    format: resource.format,
    createdAt: resource.created_at,
  };
}

export async function GET() {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: MISSING_CONFIG_MESSAGE }, { status: 503 });
  }

  try {
    const cld = getCloudinary(config);
    const result = await cld.search
      .expression(`resource_type:${AUDIO_RESOURCE_TYPE} AND tags=${LIBRARY_TAG}`)
      .with_field("context")
      .sort_by("created_at", "desc")
      .max_results(200)
      .execute();

    const resources = (result.resources ?? []) as SearchResource[];
    return NextResponse.json({ tracks: resources.map(toTrack) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lecture de la bibliothèque impossible.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const config = readConfig();
  if (!config) {
    return NextResponse.json({ error: MISSING_CONFIG_MESSAGE }, { status: 503 });
  }

  const publicId = new URL(request.url).searchParams.get("publicId");
  if (!publicId) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  try {
    const cld = getCloudinary(config);
    const result = await cld.uploader.destroy(publicId, {
      resource_type: AUDIO_RESOURCE_TYPE,
      invalidate: true,
    });
    if (result.result !== "ok" && result.result !== "not found") {
      return NextResponse.json({ error: `Cloudinary a répondu : ${result.result}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suppression impossible.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
