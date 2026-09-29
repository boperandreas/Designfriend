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
export function buildSystem(skisser = false): string {
  const filled = SYSTEM_PROMPT
    .replace("{projektminne}", CONTEXT_POINTER)
    .replace("{smakprofil}", "(inte byggd ännu)")
    .replace("{arbetssatt}", "(inga aktiva lärdomar ännu)")
    .replace("{mina_mobler}", "(inga ännu)");
  return skisser
    ? `${filled}\n\nI den här versionen av appen kan du göra idéskisser med verktyget gor_skiss.`
    : `${filled}\n\nDu kan inte skapa bilder ännu i den här versionen av appen. Beskriv idéskisser i ord.`;
}

export interface SkissRad { beskrivning: string; status: string; skapad: string }

const STATUS: Record<string, string> = { ny: "på väg", pagar: "på väg", klar: "klar och visad", fel: "misslyckades" };

/** The tool the advisor uses to ask for an idea sketch. */
export const SKISS_TOOL = {
  name: "gor_skiss",
  description: "Gör en idéskiss: ändrar ett av användarens rumsfoton med en bildmodell, till exempel tar bort " +
    "en möbel, byter en matta eller målar en vägg. Skissen görs i bakgrunden och dyker upp i samtalet efter " +
    "ungefär en halv minut. Allt utanför områdena lämnas pixel för pixel som i fotot. Högst en skiss per svar.",
  input_schema: {
    type: "object",
    properties: {
      bild: { type: "integer", description: "Numret på rumsfotot som ska ändras, enligt bildlistan." },
      instruktion: {
        type: "string",
        description: "Instruktion till bildmodellen på engelska. Konkret: vad som ändras, var, kulör och material. " +
          "Exempel: 'Remove the dark grey armchair and the footstool in front of the sofa. Show the floor and the " +
          "wall that were behind them.'",
      },
      omraden: {
        type: "array",
        items: { type: "string" },
        description: "Delarna av fotot som får ändras, som korta engelska substantivfraser, till exempel " +
          "['dark armchair', 'footstool']. För en ny matta: ['rug', 'floor']. För en vägg: ['wall behind the sofa']. " +
          "Tom lista bara när hela rummet får ändras.",
      },
      beskrivning: { type: "string", description: "Kort bildtext på svenska under skissen, till exempel 'Utan fåtöljen och pallen'." },
    },
    required: ["bild", "instruktion", "omraden", "beskrivning"],
  },
};

/**
 * The photo a sketch starts from: the numbered photo if it is a room photo,
 * otherwise the latest room photo.
 */
export function sourcePhoto<T extends { typ: string }>(bilder: T[], nummer: unknown): T | undefined {
  const n = typeof nummer === "number" ? nummer : Number(nummer);
  const vald = Number.isInteger(n) ? bilder[n - 1] : undefined;
  if (vald?.typ === "rum") return vald;
  return [...bilder].reverse().find((b) => b.typ === "rum");
}

/** The changing context, sent with the latest user message only. */
export function buildContext(
  minne: unknown,
  lastMessageAt: string | null,
  now = new Date(),
  skisser: SkissRad[] = [],
): string {
  const minneText = minne && Object.keys(minne as object).length
    ? JSON.stringify(minne, null, 2)
    : "(tomt, första samtalet i projektet)";
  const today = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
  const last = lastMessageAt
    ? `Förra meddelandet i samtalet skickades ${relativeTime(lastMessageAt, now.getTime())}.`
    : "Det här är början på samtalet.";
  const skissText = skisser.length
    ? `\n\nSenaste idéskisser:\n${skisser.map((s) => `- ${s.beskrivning} (${STATUS[s.status] ?? s.status}, ${relativeTime(s.skapad, now.getTime())})`).join("\n")}`
    : "";
  return `<sammanhang>\nDagens datum: ${today}. ${last}\n\nProjektminne:\n${minneText}${skissText}\n</sammanhang>`;
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
