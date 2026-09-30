// Pure helpers for the sketch job, kept apart so they can be tested.

export const DEFAULT_MODEL = "fal-ai/nano-banana-2/edit";
export const SAM_MODEL = "fal-ai/sam-3/image";
export const MAX_OMRADEN = 4;

const KEEP = "Keep everything else exactly as in the photo: the same camera position, framing and " +
  "perspective, the same light, the same wall, floor and ceiling colours, and every other object " +
  "unchanged. The result must look like a real, unedited photograph of the same room.";

const REFS = "The first image is the photo of the room to edit. The other images are references: when the " +
  "instruction mentions them, copy that object's shape, proportions, material and colour faithfully. Do not copy " +
  "anything else from the reference images.";

/** The instruction sent to the image model. */
export function editPrompt(instruktion: string, forlagor = 0): string {
  return [forlagor ? REFS : "", instruktion.trim(), KEEP].filter(Boolean).join("\n\n");
}

/** Model-specific input for an edit of one photo, with optional reference images after it. */
export function editInput(model: string, instruktion: string, imageUrl: string, refUrls: string[] = []): Record<string, unknown> {
  const base = {
    prompt: editPrompt(instruktion, refUrls.length), image_urls: [imageUrl, ...refUrls], num_images: 1, output_format: "jpeg",
  };
  if (model.includes("nano-banana")) return { ...base, aspect_ratio: "auto", resolution: "2K", limit_generations: true };
  if (model.includes("gpt-image")) return { ...base, image_size: "auto", quality: "medium" };
  if (model.includes("flux")) return { prompt: base.prompt, image_urls: base.image_urls, output_format: "jpeg", image_size: "auto" };
  return base;
}

/** Areas to segment: trimmed, de-duplicated, at most MAX_OMRADEN. */
export function cleanOmraden(omraden: unknown): string[] {
  if (!Array.isArray(omraden)) return [];
  const out: string[] = [];
  for (const o of omraden) {
    if (typeof o !== "string") continue;
    const t = o.trim().slice(0, 80);
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, MAX_OMRADEN);
}

interface SamOutput {
  masks?: { url?: string }[];
  scores?: number[];
  metadata?: { score?: number }[];
}

/**
 * Pick the masks worth keeping from one SAM 3 answer. SAM returns up to a few
 * candidates per phrase; weak ones are usually other objects, so we keep those
 * scoring at least `min`, and always the best one if any exist.
 */
export function pickMasks(out: SamOutput, min = 0.4): string[] {
  const masks = (out.masks ?? []).map((m, i) => ({
    url: m?.url,
    score: out.scores?.[i] ?? out.metadata?.[i]?.score ?? 1,
  })).filter((m): m is { url: string; score: number } => typeof m.url === "string");
  if (!masks.length) return [];
  masks.sort((a, b) => b.score - a.score);
  const kept = masks.filter((m) => m.score >= min);
  return (kept.length ? kept : masks.slice(0, 1)).map((m) => m.url);
}

/**
 * The last word of a phrase ("dark grey armchair" -> "armchair"). SAM 3 is
 * tried again with it when the full phrase finds nothing.
 */
export function headNoun(omrade: string): string | null {
  const ord = omrade.trim().toLowerCase().split(/\s+/);
  // Only short object names. "rug area in front of sofa" must never become "sofa".
  if (ord.length < 2 || ord.length > 3) return null;
  if (ord.some((o) => PLATSORD.has(o))) return null;
  return ord[ord.length - 1];
}

const PLATSORD = new Set(["in", "on", "of", "at", "by", "behind", "near", "next", "front", "between", "under",
  "above", "area", "space", "spot", "place", "part", "corner", "side"]);

export interface Plats { x: number; y: number; bredd: number; hojd: number }

/** Boxes in percent of the photo, clamped to it; nonsense is dropped. At most four. */
export function cleanPlatser(platser: unknown): Plats[] {
  if (!Array.isArray(platser)) return [];
  const out: Plats[] = [];
  for (const p of platser) {
    if (!p || typeof p !== "object") continue;
    const v = p as Record<string, unknown>;
    const n = (k: string) => Number(v[k]);
    let x = n("x"), y = n("y"), bredd = n("bredd"), hojd = n("hojd");
    if (![x, y, bredd, hojd].every(Number.isFinite) || bredd <= 0 || hojd <= 0) continue;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    bredd = Math.min(100 - x, bredd);
    hojd = Math.min(100 - y, hojd);
    if (bredd < 1 || hojd < 1) continue;
    out.push({ x, y, bredd, hojd });
  }
  return out.slice(0, 4);
}

/** Start of the rolling 24-hour window used for the daily cap. */
export function dayStart(now = new Date()): string {
  return new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
}

/**
 * Retry a storage or database call. On the free plan, Supabase refuses
 * requests when too many connections are open ("Too many connections").
 */
export async function withRetry<T>(fn: () => Promise<T>, tries = 4, wait = (i: number) => 400 * 2 ** i): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, wait(i)));
    }
  }
  throw last;
}
