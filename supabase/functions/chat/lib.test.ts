import { deepStrictEqual as assertEquals, ok as assert } from "node:assert";
import { alternate, buildSystem, relativeTime } from "./lib.ts";

Deno.test("alternate merges consecutive same-role text and starts with user", () => {
  const out = alternate([
    { role: "assistant", content: "hej" },
    { role: "user", content: "a" },
    { role: "user", content: "b" },
    { role: "assistant", content: "c" },
  ]);
  assertEquals(out, [
    { role: "user", content: "a\n\nb" },
    { role: "assistant", content: "c" },
  ]);
});

Deno.test("relativeTime speaks Swedish", () => {
  const now = Date.parse("2026-09-27T12:00:00Z");
  assertEquals(relativeTime("2026-09-27T11:30:00Z", now), "för mindre än en timme sedan");
  assertEquals(relativeTime("2026-09-27T07:00:00Z", now), "för 5 timmar sedan");
  assertEquals(relativeTime("2026-09-26T12:00:00Z", now), "i går");
  assertEquals(relativeTime("2026-09-24T12:00:00Z", now), "för 3 dagar sedan");
});

Deno.test("buildSystem fills placeholders and adds context", () => {
  const s = buildSystem({ mål: "lugnare vardagsrum" }, null);
  assert(s.includes("lugnare vardagsrum"));
  assert(!s.includes("{projektminne}"));
  assert(!s.includes("{smakprofil}"));
  assert(s.includes("Det här är början på samtalet."));
  const tomt = buildSystem({}, "2026-09-20T12:00:00Z");
  assert(tomt.includes("första samtalet i projektet"));
  assert(tomt.includes("Förra meddelandet"));
});
