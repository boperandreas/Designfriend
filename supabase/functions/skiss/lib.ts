// Pure helpers for the sketch job, kept apart so they can be tested.

export const DEFAULT_MODEL = "fal-ai/nano-banana-2/edit";
export const SAM_MODEL = "fal-ai/sam-3/image";
export const MAX_OMRADEN = 4;

const KEEP = "Keep everything else exactly as in the photo: the same camera position, framing and " +
  "perspective, the same light, the same wall, floor and ceiling colours, and every other object " +
  "unchanged. The result must look like a real, unedited photograph of the same room.";

/** The instruction sent to the image model. */
export function editPrompt(instruktion: string): string {
  return `${instruktion.trim()}\n\n${KEEP}`;
}

/** Model-specific input for an edit of one photo. */
export function editInput(model: string, instruktion: string, imageUrl: string): Record<string, unknown> {
  const base = { prompt: editPrompt(instruktion), image_urls: [imageUrl], num_images: 1, output_format: "jpeg" };
  if (model.includes("nano-banana")) return { ...base, aspect_ratio: "auto", resolution: "1K", limit_generations: true };
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

/** Start of the rolling 24-hour window used for the daily cap. */
export function dayStart(now = new Date()): string {
  return new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
}
