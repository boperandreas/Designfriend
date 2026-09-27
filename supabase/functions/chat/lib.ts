import { SYSTEM_PROMPT } from "../_shared/prompt.ts";

export type Roll = "user" | "assistant";
// deno-lint-ignore no-explicit-any
export type Block = Record<string, any>;
export interface ApiMessage { role: Roll; content: string | Block[] }

export function relativeTime(iso: string, now = Date.now()): string {
  const min = Math.round((now - new Date(iso).getTime()) / 60000);
  if (min < 60) return "för mindre än en timme sedan";
  const h = Math.round(min / 60);
  if (h < 24) return `för ${h} timmar sedan`;
  const d = Math.round(h / 24);
  return d === 1 ? "i går" : `för ${d} dagar sedan`;
}

export function buildSystem(minne: unknown, lastMessageAt: string | null): string {
  const minneText = minne && Object.keys(minne as object).length
    ? JSON.stringify(minne, null, 2)
    : "(tomt, första samtalet i projektet)";
  const filled = SYSTEM_PROMPT
    .replace("{projektminne}", minneText)
    .replace("{smakprofil}", "(inte byggd ännu)")
    .replace("{arbetssatt}", "(inga aktiva lärdomar ännu)")
    .replace("{mina_mobler}", "(inga ännu)");
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
  const last = lastMessageAt
    ? `Förra meddelandet i samtalet skickades ${relativeTime(lastMessageAt)}.`
    : "Det här är början på samtalet.";
  return `${filled}\n\n## Nu\n\nDagens datum: ${today}. ${last}\nDu kan inte skapa bilder ännu i den här versionen av appen. Beskriv idéskisser i ord.`;
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

