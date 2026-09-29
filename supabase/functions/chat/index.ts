// Edge function: one turn of the conversation with the advisor.
//
// POST { projekt_id: string, text: string, bild_ids?: string[] }
// Authorization: Bearer <user access token>
//
// Saves the user's message, calls Claude with the system prompt, the
// project's photos, recent history and the project memory, streams the reply
// back as plain text, saves the reply, and then updates the project memory in
// the background.
//
// Latency and cost depend on the prompt cache. The request is laid out so the
// start of it is identical from turn to turn: tools, a static system prompt,
// the photos (as Files API ids), then history. Everything that changes each
// turn (memory, date) is sent only with the newest user message.
//
// Secrets (set in Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY  required
//   ANTHROPIC_MODEL    optional, default "claude-sonnet-5"
//   MEMORY_MODEL       optional, default "claude-haiku-4-5-20251001"
//   WEB_SEARCH_TOOL    optional, default "web_search_20250305"; "off" disables
//   ANTHROPIC_EFFORT   optional, default "low": how much the model thinks before
//                      answering (low, medium, high, xhigh, max). Sonnet 5 thinks at
//                      "high" by default, which delays the first word by many seconds.
//   FAL_KEY            optional: turns on idea sketches (the gor_skiss tool). The
//                      sketch itself is made by the "skiss" function.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { ANTHROPIC_API, anthropicHeaders, uploadFile } from "../_shared/anthropic.ts";
import {
  alternate, bersOmSkiss, buildContext, buildSystem, CACHE, markHistoryCache, SKISS_TOOL, sourcePhoto,
  type ApiMessage, type Block, type Roll, type SkissRad,
} from "./lib.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
const MEMORY_MODEL = Deno.env.get("MEMORY_MODEL") ?? "claude-haiku-4-5-20251001";
const WEB_SEARCH_TOOL = Deno.env.get("WEB_SEARCH_TOOL") ?? "web_search_20250305";
const EFFORT = Deno.env.get("ANTHROPIC_EFFORT") ?? "low";
const HISTORY_LIMIT = 40;
const IMAGE_LIMIT = 16;
const SKISSER = Boolean(Deno.env.get("FAL_KEY"));
const SYSTEM = buildSystem(SKISSER);

interface Meddelande { roll: Roll; text: string; bilder: string[]; skapad: string }
interface Bild {
  id: string; typ: "rum" | "moodboard"; sokvag: string; favorit: boolean;
  kommentar: string | null; anthropic_file_id: string | null;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Make sure every photo has a Files API id; upload the ones that don't. */
async function ensureFiles(sb: SupabaseClient, bilder: Bild[], apiKey: string): Promise<void> {
  await Promise.all(bilder.filter((b) => !b.anthropic_file_id).map(async (b) => {
    try {
      const { data, error } = await sb.storage.from("bilder").download(b.sokvag);
      if (error || !data) throw new Error(error?.message ?? "no data");
      const id = await uploadFile(data, `${b.id}.jpg`, apiKey);
      b.anthropic_file_id = id;
      const { error: upd } = await sb.from("bild").update({ anthropic_file_id: id }).eq("id", b.id);
      if (upd) console.error("could not store file id", upd.message);
    } catch (e) {
      console.error("photo upload to Anthropic failed", b.id, e);
    }
  }));
}

function imageBlocks(bilder: Bild[]): Block[] {
  const med = bilder.filter((b) => b.anthropic_file_id);
  if (!med.length) return [];
  const blocks: Block[] = [{
    type: "text",
    text: "Bilderna i projektet, numrerade. Rumsfoton visar hur rummet ser ut i dag. Moodboardbilder visar vad användaren gillar.",
  }];
  bilder.forEach((b, i) => {
    if (!b.anthropic_file_id) return;
    const etikett = `Bild ${i + 1}: ${b.typ === "rum" ? "rumsfoto" : "moodboard"}${b.favorit ? ", favorit" : ""}${b.kommentar ? `. Användarens kommentar: ${b.kommentar}` : ""}`;
    blocks.push({ type: "text", text: etikett });
    blocks.push({ type: "image", source: { type: "file", file_id: b.anthropic_file_id } });
  });
  blocks[blocks.length - 1].cache_control = CACHE;
  return blocks;
}

async function callClaude(body: Block, apiKey: string): Promise<Response> {
  return await fetch(`${ANTHROPIC_API}/messages`, {
    method: "POST",
    headers: { ...anthropicHeaders(apiKey), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function updateMemory(
  sb: SupabaseClient,
  projektId: string,
  gammalt: unknown,
  senaste: { roll: Roll; text: string }[],
  apiKey: string,
) {
  const transcript = senaste.map((m) => `${m.roll === "user" ? "Användaren" : "Vännen"}: ${m.text}`).join("\n\n");
  const instruktion = `Du för projektminnet åt en inredningsrådgivare. Uppdatera minnet utifrån det senaste i samtalet. Behåll allt som fortfarande gäller, lägg till det nya, ändra det som ändrats. Spara användarens egna ord som citat där de säger något viktigt. Skriv bara sådant som faktiskt sagts eller beslutats, inga egna slutsatser om personen, och aldrig omdömen som "osäker".

Svara med enbart ett JSON-objekt med nycklarna:
"mål" (sträng), "känsla" (lista), "behålls" (lista), "prövat" (lista av {"vad","utfall","varför","citat"}), "beslut" (lista av {"vad","varför","datum","lätt_att_ändra"}), "öppna_frågor" (lista av {"fråga","nästa_steg","vem"}), "pågående" (sträng), "stabilt_över_versioner" (lista), "praktiskt" (lista med fakta som mått, husdjur, hyr eller äger, vem som bestämmer vad).

Nuvarande minne:
${JSON.stringify(gammalt ?? {}, null, 2)}

Det senaste i samtalet:
${transcript}`;

  const res = await callClaude({
    model: MEMORY_MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: instruktion }],
  }, apiKey);
  if (!res.ok) {
    console.error("memory update failed", res.status, await res.text());
    return;
  }
  const data = await res.json();
  const text: string = (data.content ?? []).filter((b: Block) => b.type === "text").map((b: Block) => b.text).join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return;
  let innehall: unknown;
  try {
    innehall = JSON.parse(text.slice(start, end + 1));
  } catch {
    console.error("memory update: invalid JSON");
    return;
  }
  const { data: befintligt } = await sb.from("projektminne").select("version").eq("projekt_id", projektId).maybeSingle();
  const { error } = await sb.from("projektminne").upsert({
    projekt_id: projektId,
    innehall,
    version: (befintligt?.version ?? 0) + 1,
    uppdaterad: new Date().toISOString(),
  });
  if (error) console.error("memory upsert failed", error.message);
}

Deno.serve(async (req) => {
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0);
  const timing: Record<string, unknown> = {};

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Bara POST stöds." });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY saknas i funktionens hemligheter." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Du behöver logga in." });

  let payload: { projekt_id?: string; text?: string; bild_ids?: string[] };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Ogiltig förfrågan." });
  }
  const projektId = payload.projekt_id;
  const bildIds = Array.isArray(payload.bild_ids) ? payload.bild_ids : [];
  const text = (payload.text ?? "").trim();
  if (!projektId || (!text && !bildIds.length)) return json(400, { error: "Meddelandet är tomt." });

  // The public key: the legacy anon key if present, otherwise the publishable
  // key the web app sends in the apikey header.
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, publicKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Everything we need, in parallel. RLS limits every query to the caller.
  const [userRes, projektRes, historikRes, bilderRes, minneRes, skissRes] = await Promise.all([
    sb.auth.getUser(authHeader.replace(/^Bearer /i, "")),
    sb.from("projekt").select("id").eq("id", projektId).maybeSingle(),
    sb.from("meddelande").select("roll,text,bilder,skapad").eq("projekt_id", projektId)
      .order("skapad", { ascending: false }).limit(HISTORY_LIMIT),
    sb.from("bild").select("id,typ,sokvag,favorit,kommentar,anthropic_file_id").eq("projekt_id", projektId)
      .order("skapad", { ascending: true }).limit(IMAGE_LIMIT),
    sb.from("projektminne").select("innehall").eq("projekt_id", projektId).maybeSingle(),
    sb.from("skiss").select("beskrivning,status,skapad").eq("projekt_id", projektId)
      .order("skapad", { ascending: false }).limit(5),
  ]);
  timing.db_ms = ms();
  if (userRes.error || !userRes.data.user) return json(401, { error: "Inloggningen har gått ut. Logga in igen." });
  if (!projektRes.data) return json(404, { error: "Projektet finns inte." });

  const tidigare = ((historikRes.data ?? []) as Meddelande[]).reverse();
  const bildLista = (bilderRes.data ?? []) as Bild[];
  const minne = minneRes.data?.innehall;
  const nummer = new Map(bildLista.map((b, i) => [b.id, i + 1]));
  const bifogat = bildIds.map((id) => nummer.get(id)).filter(Boolean);
  const userText = [text || "(skickade bilder)", bifogat.length ? `[Bifogade nu: bild ${bifogat.join(", ")}]` : ""]
    .filter(Boolean).join("\n");

  // Save the user's message while the rest runs.
  const sparaFraga = sb.from("meddelande").insert({
    projekt_id: projektId, roll: "user", text: text || "(bilder)", bilder: bildIds,
  });

  const nyaFiler = bildLista.filter((b) => !b.anthropic_file_id).length;
  await ensureFiles(sb, bildLista, apiKey);
  timing.files_ms = ms();
  timing.new_files = nyaFiler;
  timing.images = bildLista.length;

  const lastAt = tidigare.length ? tidigare[tidigare.length - 1].skapad : null;
  const historyMsgs: ApiMessage[] = tidigare.map((m) => ({
    role: m.roll,
    content: m.roll === "user" && m.bilder?.length
      ? `${m.text}\n[Bifogade: bild ${m.bilder.map((id) => nummer.get(id)).filter(Boolean).join(", ")}]`
      : m.text,
  }));
  const skisser = (skissRes.data ?? []) as SkissRad[];
  historyMsgs.push({
    role: "user",
    content: `${buildContext(minne, lastAt, new Date(), skisser, SKISSER ? bersOmSkiss(text) : undefined)}\n\n${userText}`,
  });

  const bildBlock = imageBlocks(bildLista);
  const prefix: ApiMessage[] = bildBlock.length
    ? [{ role: "user", content: bildBlock }, { role: "assistant", content: "Jag har sett bilderna." }]
    : [];
  const messages = markHistoryCache([...prefix, ...alternate(historyMsgs)]);

  const baseBody: Block = {
    model: MODEL,
    max_tokens: 4000,
    stream: true,
    thinking: { type: "adaptive" },
    output_config: { effort: EFFORT },
    system: [{ type: "text", text: SYSTEM, cache_control: CACHE }],
    messages,
  };
  const tools: Block[] = [];
  if (SKISSER) tools.push(SKISS_TOOL);
  if (WEB_SEARCH_TOOL !== "off") {
    tools.push({
      type: WEB_SEARCH_TOOL,
      name: "web_search",
      max_uses: 3,
      user_location: { type: "approximate", country: "SE", timezone: "Europe/Stockholm" },
    });
  }

  let res = await callClaude(tools.length ? { ...baseBody, tools } : baseBody, apiKey);
  if (!res.ok && res.status === 400) {
    // Fall back to the plainest request that has worked before, so a rejected
    // option (tool version, effort level) never takes the whole app down.
    console.error("claude 400, retrying without tools and effort", await res.text());
    timing.fallback = true;
    const { thinking: _t, output_config: _o, ...plain } = baseBody;
    res = await callClaude(plain, apiKey);
  }
  timing.claude_headers_ms = ms();
  if (!res.ok || !res.body) {
    console.error("claude error", res.status, await res.text().catch(() => ""));
    return json(502, { error: "Vännen svarar inte just nu. Försök igen om en stund." });
  }

  const { error: insertError } = await sparaFraga;
  if (insertError) console.error("could not save user message", insertError.message);

  const upstream = res.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let svar = "";
  let verktygJson: string | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const ev of events) {
            const dataLine = ev.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            let data: Block;
            try {
              data = JSON.parse(dataLine.slice(6));
            } catch {
              continue;
            }
            if (data.type === "message_start") {
              const u = data.message?.usage ?? {};
              timing.input_tokens = u.input_tokens;
              timing.cache_read_tokens = u.cache_read_input_tokens;
              timing.cache_write_tokens = u.cache_creation_input_tokens;
            } else if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
              if (timing.first_token_ms === undefined) timing.first_token_ms = ms();
              svar += data.delta.text;
              controller.enqueue(encoder.encode(data.delta.text));
            } else if (data.type === "content_block_start" && data.content_block?.type === "tool_use"
              && data.content_block?.name === SKISS_TOOL.name) {
              verktygJson = "";
            } else if (data.type === "content_block_delta" && data.delta?.type === "input_json_delta" && verktygJson !== null) {
              verktygJson += data.delta.partial_json ?? "";
            } else if (data.type === "content_block_start" && data.content_block?.type === "server_tool_use") {
              timing.web_searches = ((timing.web_searches as number) ?? 0) + 1;
            } else if (data.type === "content_block_start" && data.content_block?.type === "text" && svar && !svar.endsWith("\n")) {
              // A new text block after a web search: keep the text readable.
              svar += " ";
              controller.enqueue(encoder.encode(" "));
            } else if (data.type === "content_block_start" && data.content_block?.type === "thinking") {
              if (timing.thinking_start_ms === undefined) timing.thinking_start_ms = ms();
            } else if (data.type === "message_delta") {
              timing.output_tokens = data.usage?.output_tokens;
              timing.thinking_tokens = data.usage?.output_tokens_details?.thinking_tokens;
            } else if (data.type === "error") {
              console.error("stream error", data);
            }
          }
        }
      } catch (e) {
        console.error("stream failed", e);
      }

      timing.total_ms = ms();

      // The advisor may have asked for a sketch. The reply is saved first so the
      // sketch sorts after it in the conversation.
      let skiss: Block | null = null;
      if (verktygJson !== null) {
        timing.skiss = true;
        try {
          skiss = JSON.parse(verktygJson || "{}");
        } catch {
          console.error("gor_skiss: invalid input JSON");
        }
      }
      const kalla = skiss ? sourcePhoto(bildLista, skiss.bild) : undefined;
      const skissOk = Boolean(skiss && kalla && typeof skiss.instruktion === "string");
      if (skiss && !skissOk) console.error("gor_skiss: no room photo or instruction", skiss.bild);
      const beskrivning = String(skiss?.beskrivning ?? "Idéskiss").slice(0, 200);
      console.log(JSON.stringify({ event: "chat_timing", model: MODEL, effort: EFFORT, ...timing }));

      // A sketch starts at once only when the user asked to see something;
      // otherwise it waits as a suggestion she can tap.
      const direkt = bersOmSkiss(text);
      timing.skiss_direkt = skissOk ? direkt : undefined;
      const notis = skissOk ? `[${direkt ? "Skiss beställd" : "Skiss föreslagen"}: ${beskrivning}]` : "";
      const slutsvar = [svar.trim(), notis].filter(Boolean).join("\n\n");
      if (slutsvar) {
        const { error } = await sb.from("meddelande").insert({ projekt_id: projektId, roll: "assistant", text: slutsvar });
        if (error) console.error("could not save reply", error.message);
        const senaste = [...tidigare.slice(-8).map((m) => ({ roll: m.roll, text: m.text })),
          { roll: "user" as Roll, text: userText }, { roll: "assistant" as Roll, text: slutsvar }];
        EdgeRuntime.waitUntil(updateMemory(sb, projektId, minne, senaste, apiKey));
      }

      if (skiss && kalla && skissOk) {
        const { data: rad, error } = await sb.from("skiss").insert({
          projekt_id: projektId, kalla_bild_id: kalla.id, beskrivning, status: direkt ? "ny" : "forslag",
          instruktion: String(skiss.instruktion).slice(0, 2000),
          omraden: Array.isArray(skiss.omraden) ? skiss.omraden.map(String) : [],
          platser: Array.isArray(skiss.platser) ? skiss.platser.slice(0, 4) : [],
          forlagor: (Array.isArray(skiss.forlagor) ? skiss.forlagor : [])
            .map((n: unknown) => bildLista[Number(n) - 1]?.id).filter((id: string | undefined) => id && id !== kalla.id)
            .slice(0, 3),
        }).select("id").single();
        if (error || !rad) {
          console.error("could not create sketch", error?.message);
        } else if (direkt) {
          EdgeRuntime.waitUntil(fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/skiss`, {
            method: "POST",
            headers: { Authorization: authHeader, apikey: publicKey, "Content-Type": "application/json" },
            body: JSON.stringify({ skiss_id: rad.id }),
          }).then(async (r) => {
            if (r.status !== 202) console.error("skiss start failed", r.status, await r.text());
          }).catch((e) => console.error("skiss start failed", e)));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
});
