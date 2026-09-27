import { deepStrictEqual as assertEquals, ok as assert } from "node:assert";
import { alternate, buildContext, buildSystem, markHistoryCache, relativeTime } from "./lib.ts";

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

Deno.test("buildSystem is identical on every call, so it can be cached", () => {
  const a = buildSystem();
  assertEquals(a, buildSystem());
  assert(!a.includes("{projektminne}"));
  assert(!a.includes("{smakprofil}"));
  assert(!a.includes("Dagens datum"));
});

Deno.test("buildContext carries memory and time", () => {
  const now = new Date("2026-09-27T12:00:00Z");
  const c = buildContext({ mål: "lugnare vardagsrum" }, "2026-09-24T12:00:00Z", now);
  assert(c.includes("lugnare vardagsrum"));
  assert(c.includes("för 3 dagar sedan"));
  assert(c.startsWith("<sammanhang>"));
  assert(buildContext({}, null, now).includes("första samtalet i projektet"));
});

Deno.test("markHistoryCache marks the last assistant turn before the new message", () => {
  const out = markHistoryCache([
    { role: "user", content: "a" },
    { role: "assistant", content: "b" },
    { role: "user", content: "c" },
    { role: "assistant", content: "d" },
    { role: "user", content: "e" },
  ]);
  assertEquals(out[3].content, [{ type: "text", text: "d", cache_control: { type: "ephemeral", ttl: "1h" } }]);
  assertEquals(out[1].content, "b");
  assertEquals(out[4].content, "e");
});
