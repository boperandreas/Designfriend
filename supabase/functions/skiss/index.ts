// Edge function: makes one idea sketch in the background.
//
// POST { skiss_id: string }
// Authorization: Bearer <user access token>
//
// The chat function creates the row (status "ny") when the advisor asks for a
// sketch, and then calls this function. It claims the row, answers 202 at
// once and does the work in the background:
//
//   1. SAM 3 finds each area that may change ("dark armchair", "footstool").
//   2. The image model edits the photo.
//   3. The result and the masks are copied to our own storage.
//
// The web app gets the finished row through Realtime and puts the original
// pixels back outside the masks, so the rest of the room stays exactly as it
// was (AGENTS.md rule 7).
//
// Secrets:
//   FAL_KEY         required
//   FAL_MODELL      optional, default "fal-ai/nano-banana-2/edit"
//                   (also "openai/gpt-image-2/edit", "fal-ai/flux-2-pro/edit")
//   SKISS_PER_DYGN  optional, default 20: sketches per user per 24 hours

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { fetchFile, runFal, type FalResult } from "../_shared/fal.ts";
import { cleanOmraden, dayStart, DEFAULT_MODEL, editInput, headNoun, pickMasks, SAM_MODEL } from "./lib.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const MODEL = Deno.env.get("FAL_MODELL") ?? DEFAULT_MODEL;
const PER_DYGN = Number(Deno.env.get("SKISS_PER_DYGN") ?? "20");

interface Skiss {
  id: string; projekt_id: string; user_id: string; kalla_bild_id: string | null;
  instruktion: string; omraden: string[];
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function fail(sb: SupabaseClient, id: string, fel: string) {
  await sb.from("skiss").update({ status: "fel", fel, klar: new Date().toISOString() }).eq("id", id);
}

async function samOnce(imageUrl: string, prompt: string, key: string): Promise<FalResult> {
  return await runFal(SAM_MODEL, {
    image_url: imageUrl, prompt, apply_mask: false, return_multiple_masks: true,
    max_masks: 3, include_scores: true, output_format: "png",
  }, key, 60_000);
}

/** Masks for one area. Tries the full phrase, then its last word. */
async function segment(imageUrl: string, omrade: string, key: string, log: unknown[]): Promise<string[]> {
  for (const prompt of [omrade, headNoun(omrade)]) {
    if (!prompt) continue;
    try {
      const out = await samOnce(imageUrl, prompt, key);
      const valda = pickMasks(out);
      log.push({ prompt, masks: out.masks?.length ?? 0, scores: out.scores ?? null, kept: valda.length });
      if (valda.length) return valda;
    } catch (e) {
      console.error("sam failed", prompt, e);
      log.push({ prompt, error: String(e).slice(0, 200) });
    }
  }
  return [];
}

async function run(sb: SupabaseClient, s: Skiss, key: string) {
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  const timing: Record<string, unknown> = { skiss_id: s.id, model: MODEL };
  try {
    const { count } = await sb.from("skiss").select("id", { count: "exact", head: true })
      .eq("user_id", s.user_id).gte("skapad", dayStart()).in("status", ["pagar", "klar"]);
    if ((count ?? 0) > PER_DYGN) {
      await fail(sb, s.id, "Dagens skisser är slut. Det går att göra fler i morgon.");
      return;
    }

    const { data: bild } = s.kalla_bild_id
      ? await sb.from("bild").select("sokvag").eq("id", s.kalla_bild_id).maybeSingle()
      : { data: null };
    if (!bild) {
      await fail(sb, s.id, "Fotot som skulle ändras finns inte längre.");
      return;
    }
    const signed = await sb.storage.from("bilder").createSignedUrl(bild.sokvag, 900);
    if (!signed.data?.signedUrl) throw new Error("could not sign source photo");
    const imageUrl = signed.data.signedUrl;

    const omraden = cleanOmraden(s.omraden);
    const sam: unknown[] = [];
    timing.sam = sam;
    const [maskLists, edit] = await Promise.all([
      Promise.all(omraden.map((o) => segment(imageUrl, o, key, sam))),
      runFal(MODEL, editInput(MODEL, s.instruktion, imageUrl), key),
    ]);
    timing.fal_ms = ms();
    const resultUrl: string | undefined = edit.images?.[0]?.url;
    if (!resultUrl) throw new Error(`no image in result: ${JSON.stringify(edit).slice(0, 300)}`);
    const maskUrls = maskLists.flat();
    timing.masks = maskUrls.length;
    timing.omraden = omraden.length;

    // Copy everything into our own storage; fal's copies expire in ten minutes.
    const mapp = `${s.user_id}/${s.projekt_id}`;
    const sokvag = `${mapp}/skiss-${s.id}.jpg`;
    const [resultat, ...masker] = await Promise.all([fetchFile(resultUrl), ...maskUrls.map(fetchFile)]);
    const up = await sb.storage.from("bilder").upload(sokvag, resultat, { contentType: "image/jpeg", upsert: true });
    if (up.error) throw new Error(`upload: ${up.error.message}`);
    const maskVagar = await Promise.all(masker.map(async (m, i) => {
      const p = `${mapp}/skiss-${s.id}-mask-${i}.png`;
      const r = await sb.storage.from("bilder").upload(p, m, { contentType: "image/png", upsert: true });
      if (r.error) throw new Error(`mask upload: ${r.error.message}`);
      return p;
    }));

    const { error } = await sb.from("skiss").update({
      status: "klar", sokvag, masker: maskVagar, modell: MODEL, ms: ms(), klar: new Date().toISOString(),
    }).eq("id", s.id);
    if (error) throw new Error(`update: ${error.message}`);
    timing.total_ms = ms();
    console.log(JSON.stringify({ event: "skiss_timing", ...timing }));
  } catch (e) {
    console.error("skiss failed", s.id, e);
    console.log(JSON.stringify({ event: "skiss_timing", ...timing, error: String(e).slice(0, 300), total_ms: ms() }));
    await fail(sb, s.id, "Skissen gick inte att göra. Försök igen om en stund.");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Bara POST stöds." });

  const key = Deno.env.get("FAL_KEY");
  if (!key) return json(503, { error: "Skisser är inte påslagna än." });
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Du behöver logga in." });

  let payload: { skiss_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Ogiltig förfrågan." });
  }
  if (!payload.skiss_id) return json(400, { error: "skiss_id saknas." });

  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, publicKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: user } = await sb.auth.getUser(authHeader.replace(/^Bearer /i, ""));
  if (!user.user) return json(401, { error: "Inloggningen har gått ut. Logga in igen." });

  // Claim the row, so a repeated call never starts the same job twice.
  const { data: skiss } = await sb.from("skiss").update({ status: "pagar" })
    .eq("id", payload.skiss_id).eq("status", "ny")
    .select("id,projekt_id,user_id,kalla_bild_id,instruktion,omraden").maybeSingle();
  if (!skiss) return json(409, { error: "Skissen är redan igång eller klar." });

  EdgeRuntime.waitUntil(run(sb, skiss as Skiss, key));
  return json(202, { ok: true });
});
