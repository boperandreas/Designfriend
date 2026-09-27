// Edge function: one turn of the conversation with the advisor.
//
// POST { projekt_id: string, text: string, bild_ids?: string[] }
// Authorization: Bearer <user access token>
//
// Saves the user's message, calls Claude with the system prompt, the
// project's photos, the project memory and recent history, streams the reply
// back as plain text, saves the reply, and then updates the project memory in
// the background.
//
// Secrets (set in Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY  required
//   ANTHROPIC_MODEL    optional, default "claude-sonnet-5"
//   MEMORY_MODEL       optional, default "claude-haiku-4-5-20251001"
//   WEB_SEARCH_TOOL    optional, default "web_search_20250305"; "off" disables

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { alternate, buildSystem, type ApiMessage, type Block, type Roll } from "./lib.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
const MEMORY_MODEL = Deno.env.get("MEMORY_MODEL") ?? "claude-haiku-4-5-20251001";
const WEB_SEARCH_TOOL = Deno.env.get("WEB_SEARCH_TOOL") ?? "web_search_20250305";
const HISTORY_LIMIT = 40;
const IMAGE_LIMIT = 16;

interface Meddelande { roll: Roll; text: string; bilder: string[]; skapad: string }
interface Bild { id: string; typ: "rum" | "moodboard"; sokvag: string; favorit: boolean; kommentar: string | null }

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function imageBlocks(sb: SupabaseClient, bilder: Bild[]): Promise<Block[]> {
  if (!bilder.length) return [];
  const { data, error } = await sb.storage.from("bilder").createSignedUrls(bilder.map((b) => b.sokvag), 3600);
  if (error || !data) throw new Error(`Kunde inte läsa bilderna: ${error?.message}`);
  const blocks: Block[] = [{
    type: "text",
    text: "Bilderna i projektet, numrerade. Rumsfoton visar hur rummet ser ut i dag. Moodboardbilder visar vad användaren gillar.",
  }];
  bilder.forEach((b, i) => {
    const url = data[i]?.signedUrl;
    if (!url) return;
    const etikett = `Bild ${i + 1}: ${b.typ === "rum" ? "rumsfoto" : "moodboard"}${b.favorit ? ", favorit" : ""}${b.kommentar ? `. Användarens kommentar: ${b.kommentar}` : ""}`;
    blocks.push({ type: "text", text: etikett });
    blocks.push({ type: "image", source: { type: "url", url } });
  });
  blocks[blocks.length - 1].cache_control = { type: "ephemeral" };
  return blocks;
}

async function callClaude(body: Block, apiKey: string): Promise<Response> {
  return await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Bara POST stöds." });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json(500, { error: "ANTHROPIC_API_KEY saknas i funktionens hemligheter." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "Du behöver logga in." });

  // The public key: the legacy anon key if present, otherwise the publishable
  // key the web app sends in the apikey header.
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, publicKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await sb.auth.getUser(authHeader.replace(/^Bearer /i, ""));
  if (userError || !userData.user) return json(401, { error: "Inloggningen har gått ut. Logga in igen." });

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

  // Owner check happens through RLS: a foreign project returns no row.
  const { data: projekt } = await sb.from("projekt").select("id").eq("id", projektId).maybeSingle();
  if (!projekt) return json(404, { error: "Projektet finns inte." });

  const [{ data: historik }, { data: bilder }, { data: minne }] = await Promise.all([
    sb.from("meddelande").select("roll,text,bilder,skapad").eq("projekt_id", projektId)
      .order("skapad", { ascending: false }).limit(HISTORY_LIMIT),
    sb.from("bild").select("id,typ,sokvag,favorit,kommentar").eq("projekt_id", projektId)
      .order("skapad", { ascending: true }).limit(IMAGE_LIMIT),
    sb.from("projektminne").select("innehall").eq("projekt_id", projektId).maybeSingle(),
  ]);

  const tidigare = ((historik ?? []) as Meddelande[]).reverse();
  const bildLista = (bilder ?? []) as Bild[];
  const nummer = new Map(bildLista.map((b, i) => [b.id, i + 1]));
  const bifogat = bildIds.map((id) => nummer.get(id)).filter(Boolean);
  const userText = [text || "(skickade bilder)", bifogat.length ? `[Bifogade nu: bild ${bifogat.join(", ")}]` : ""]
    .filter(Boolean).join("\n");

  const { error: insertError } = await sb.from("meddelande").insert({
    projekt_id: projektId, roll: "user", text: text || "(bilder)", bilder: bildIds,
  });
  if (insertError) return json(500, { error: "Kunde inte spara meddelandet." });

  const lastAt = tidigare.length ? tidigare[tidigare.length - 1].skapad : null;
  const system = buildSystem(minne?.innehall, lastAt);

  let bildBlock: Block[] = [];
  try {
    bildBlock = await imageBlocks(sb, bildLista);
  } catch (e) {
    console.error(e);
  }

  const historyMsgs: ApiMessage[] = tidigare.map((m) => ({
    role: m.roll,
    content: m.roll === "user" && m.bilder?.length
      ? `${m.text}\n[Bifogade: bild ${m.bilder.map((id) => nummer.get(id)).filter(Boolean).join(", ")}]`
      : m.text,
  }));
  historyMsgs.push({ role: "user", content: userText });

  const prefix: ApiMessage[] = bildBlock.length
    ? [{ role: "user", content: bildBlock }, { role: "assistant", content: "Jag har sett bilderna." }]
    : [];
  const messages = [...prefix, ...alternate(historyMsgs)];

  const baseBody: Block = {
    model: MODEL,
    max_tokens: 2000,
    stream: true,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
  };
  const tools = WEB_SEARCH_TOOL === "off" ? undefined : [{
    type: WEB_SEARCH_TOOL,
    name: "web_search",
    max_uses: 3,
    user_location: { type: "approximate", country: "SE", timezone: "Europe/Stockholm" },
  }];

  let res = await callClaude(tools ? { ...baseBody, tools } : baseBody, apiKey);
  if (!res.ok && res.status === 400 && tools) {
    console.error("claude 400 with web search, retrying without", await res.text());
    res = await callClaude(baseBody, apiKey);
  }
  if (!res.ok || !res.body) {
    console.error("claude error", res.status, await res.text().catch(() => ""));
    return json(502, { error: "Vännen svarar inte just nu. Försök igen om en stund." });
  }

  const upstream = res.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let svar = "";

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
            if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
              svar += data.delta.text;
              controller.enqueue(encoder.encode(data.delta.text));
            } else if (data.type === "content_block_start" && data.content_block?.type === "text" && svar && !svar.endsWith("\n")) {
              // A new text block after a web search: keep the text readable.
              svar += " ";
              controller.enqueue(encoder.encode(" "));
            } else if (data.type === "error") {
              console.error("stream error", data);
            }
          }
        }
      } catch (e) {
        console.error("stream failed", e);
      }

      const slutsvar = svar.trim();
      if (slutsvar) {
        const { error } = await sb.from("meddelande").insert({ projekt_id: projektId, roll: "assistant", text: slutsvar });
        if (error) console.error("could not save reply", error.message);
        const senaste = [...tidigare.slice(-8).map((m) => ({ roll: m.roll, text: m.text })),
          { roll: "user" as Roll, text: userText }, { roll: "assistant" as Roll, text: slutsvar }];
        EdgeRuntime.waitUntil(updateMemory(sb, projektId, minne?.innehall, senaste, apiKey));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
});
