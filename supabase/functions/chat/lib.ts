import { SYSTEM_PROMPT } from "../_shared/prompt.ts";

export type Roll = "user" | "assistant";
// deno-lint-ignore no-explicit-any
export type Block = Record<string, any>;
export interface ApiMessage { role: Roll; content: string | Block[] }

/** Cache marker. One hour, so a conversation that pauses briefly stays cached. */
export const CACHE = { type: "ephemeral", ttl: "1h" } as const;

export function relativeTime(iso: string, now = Date.now()): string {
  const min = Math.round((now - new Date(iso).getTime()) / 60000);
  if (min < 60) return "för mindre än en timme sedan";
  const h = Math.round(min / 60);
  if (h < 24) return `för ${h} timmar sedan`;
  const d = Math.round(h / 24);
  return d === 1 ? "i går" : `för ${d} dagar sedan`;
}

const CONTEXT_POINTER = "(se blocket <sammanhang> i användarens senaste meddelande)";

/**
 * The system prompt must be identical on every call so that it, and the photos
 * after it, can be served from the prompt cache. Anything that changes between
 * turns goes into buildContext() instead.
 */
export function buildSystem(): string {
  const filled = SYSTEM_PROMPT
    .replace("{projektminne}", CONTEXT_POINTER)
    .replace("{smakprofil}", "(inte byggd ännu)")
    .replace("{arbetssatt}", "(inga aktiva lärdomar ännu)")
    .replace("{mina_mobler}", "(inga ännu)");
  return `${filled}\n\nDu kan inte skapa bilder ännu i den här versionen av appen. Beskriv idéskisser i ord.`;
}

/** The changing context, sent with the latest user message only. */
export function buildContext(minne: unknown, lastMessageAt: string | null, now = new Date()): string {
  const minneText = minne && Object.keys(minne as object).length
    ? JSON.stringify(minne, null, 2)
    : "(tomt, första samtalet i projektet)";
  const today = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
  const last = lastMessageAt
    ? `Förra meddelandet i samtalet skickades ${relativeTime(lastMessageAt, now.getTime())}.`
    : "Det här är början på samtalet.";
  return `<sammanhang>\nDagens datum: ${today}. ${last}\n\nProjektminne:\n${minneText}\n</sammanhang>`;
}

// Merge consecutive messages with the same role; the API needs alternation.
export function alternate(msgs: ApiMessage[]): ApiMessage[] {
  const out: ApiMessage[] = [];
  for (const m of msgs) {
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role && typeof prev.content === "string" && typeof m.content === "string") {
      prev.content = `${prev.content}\n\n${m.content}`;
    } else {
      out.push({ ...m });
    }
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

/**
 * Mark the last assistant message before the final user turn as a cache
 * breakpoint, so earlier history is read from cache on the next turn.
 */
export function markHistoryCache(msgs: ApiMessage[]): ApiMessage[] {
  const out = msgs.map((m) => ({ ...m }));
  for (let i = out.length - 2; i >= 0; i--) {
    if (out[i].role === "assistant" && typeof out[i].content === "string") {
      out[i].content = [{ type: "text", text: out[i].content as string, cache_control: CACHE }];
      break;
    }
  }
  return out;
}
