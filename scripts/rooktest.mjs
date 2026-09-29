// Smoke test for the live app: signs in as a test user, makes sure a test
// room with a synthetic photo exists, and sends a few messages to the chat
// function. Prints time to first byte and total time per message. The chat
// function also logs a detailed `chat_timing` line for each turn.
//
// Env: TEST_EMAIL, TEST_PASSWORD (a dedicated test user, never a real one)
//      SUPABASE_URL, SUPABASE_KEY (optional, defaults to web/.env.production)
//      MESSAGES (optional, number of messages, default 3)
//      SKISS (optional, "0" skips the sketch step at the end)
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../web/.env.production", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY;
const { TEST_EMAIL, TEST_PASSWORD } = process.env;
const N = Number(process.env.MESSAGES ?? 3);
if (!TEST_EMAIL || !TEST_PASSWORD) throw new Error("TEST_EMAIL and TEST_PASSWORD are required");

const MEDDELANDEN = [
  "Här är vardagsrummet. Jag vill att det ska kännas lugnare och varmare.",
  "Vad skulle du börja med?",
  "Soffan vill jag behålla. Hur påverkar det ditt förslag?",
  "Och vad är lättast att ångra om det inte blir bra?",
  "Hur skulle du tänka kring belysningen på kvällen?",
];

async function must(res, what) {
  if (!res.ok) throw new Error(`${what}: ${res.status} ${await res.text()}`);
  return res;
}

const auth = await (await must(await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
}), "sign in")).json();
const token = auth.access_token;
const uid = auth.user.id;
const h = { apikey: KEY, Authorization: `Bearer ${token}` };

// Test room, created once.
let projekt = (await (await must(await fetch(`${URL_}/rest/v1/projekt?namn=eq.R%C3%B6ktest&select=id`, { headers: h }), "list rooms")).json())[0];
if (!projekt) {
  projekt = (await (await must(await fetch(`${URL_}/rest/v1/projekt`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ namn: "Röktest" }),
  }), "create room")).json())[0];
}

// Start every run with an empty conversation, so the same test messages are
// not answered as repeats. The photo is kept, so it is not re-uploaded.
await must(await fetch(`${URL_}/rest/v1/meddelande?projekt_id=eq.${projekt.id}`, { method: "DELETE", headers: h }), "clear messages");
await must(await fetch(`${URL_}/rest/v1/projektminne?projekt_id=eq.${projekt.id}`, { method: "DELETE", headers: h }), "clear memory");
await must(await fetch(`${URL_}/rest/v1/skiss?projekt_id=eq.${projekt.id}`, { method: "DELETE", headers: h }), "clear sketches");

// Synthetic room photo, uploaded once.
const bilder = await (await must(await fetch(`${URL_}/rest/v1/bild?projekt_id=eq.${projekt.id}&select=id`, { headers: h }), "list photos")).json();
let nyBild = [];
if (!bilder.length) {
  const sokvag = `${uid}/${projekt.id}/${randomUUID()}.jpg`;
  await must(await fetch(`${URL_}/storage/v1/object/bilder/${sokvag}`, {
    method: "POST",
    headers: { ...h, "Content-Type": "image/jpeg" },
    body: readFileSync(new URL("./rooktest-rum.jpg", import.meta.url)),
  }), "upload photo");
  const rad = (await (await must(await fetch(`${URL_}/rest/v1/bild`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ projekt_id: projekt.id, typ: "rum", sokvag }),
  }), "save photo")).json())[0];
  nyBild = [rad.id];
}

// SAM is trained on real photos and finds nothing in the flat drawing. Once,
// the drawing is turned into a photorealistic room with the sketch function,
// and the result replaces it as the room's photo. Entirely synthetic.
const FOTO = "Turn this flat illustration into a photorealistic photograph of a real Scandinavian living room with " +
  "the same layout: a light grey wall, a white framed poster on the left, a tall white bookshelf in the middle with a " +
  "white paper pendant lamp above it, a black TV on the right on a dark wooden TV bench, a light wooden floor, a sage " +
  "green linen sofa on the left, a dark grey upholstered armchair in the middle and an orange rectangular rug in front. " +
  "Natural daylight, taken with a phone camera. No people.";

async function waitSketch(id) {
  const t0 = performance.now();
  while (performance.now() - t0 < 150_000) {
    const rad = (await (await must(await fetch(`${URL_}/rest/v1/skiss?id=eq.${id}&select=status,sokvag,fel`, { headers: h }), "read sketch")).json())[0];
    if (rad && (rad.status === "klar" || rad.status === "fel")) return rad;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

if (process.env.SKISS !== "0") {
  const rum = await (await must(await fetch(`${URL_}/rest/v1/bild?projekt_id=eq.${projekt.id}&typ=eq.rum&select=id,sokvag`, { headers: h }), "list room photos")).json();
  if (rum.length && !rum.some((b) => b.sokvag.includes("/skiss-"))) {
    console.log("Making the test photo photorealistic (once)");
    const skiss = (await (await must(await fetch(`${URL_}/rest/v1/skiss`, {
      method: "POST",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ projekt_id: projekt.id, kalla_bild_id: rum[0].id, beskrivning: "Röktestets foto", instruktion: FOTO, omraden: [] }),
    }), "order photo")).json())[0];
    await must(await fetch(`${URL_}/functions/v1/skiss`, {
      method: "POST", headers: { ...h, "Content-Type": "application/json" }, body: JSON.stringify({ skiss_id: skiss.id }),
    }), "start photo");
    const klar = await waitSketch(skiss.id);
    if (klar?.status === "klar") {
      const rad = (await (await must(await fetch(`${URL_}/rest/v1/bild`, {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ projekt_id: projekt.id, typ: "rum", sokvag: klar.sokvag }),
      }), "save realistic photo")).json())[0];
      for (const b of rum) await must(await fetch(`${URL_}/rest/v1/bild?id=eq.${b.id}`, { method: "DELETE", headers: h }), "drop drawing");
      nyBild = [rad.id];
    } else {
      console.log("Could not make the photo realistic:", klar?.fel ?? "timeout");
    }
    await must(await fetch(`${URL_}/rest/v1/skiss?id=eq.${skiss.id}`, { method: "DELETE", headers: h }), "drop photo sketch");
  }
}

console.log(`Room ${projekt.id}, sending ${N} messages`);
const rows = [];
const skissSteg = process.env.SKISS !== "0";
const texter = Array.from({ length: N }, (_, i) => MEDDELANDEN[i % MEDDELANDEN.length]);
if (skissSteg) texter.push("Kan du visa hur rummet ser ut utan den grå fåtöljen?");
for (let i = 0; i < texter.length; i++) {
  const text = texter[i];
  const t0 = performance.now();
  const res = await must(await fetch(`${URL_}/functions/v1/chat`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ projekt_id: projekt.id, text, bild_ids: i === 0 ? nyBild : [] }),
  }), `message ${i + 1}`);
  const reader = res.body.getReader();
  let first = null;
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (first === null && value?.length) first = performance.now() - t0;
    bytes += value?.length ?? 0;
  }
  const total = performance.now() - t0;
  rows.push({ message: i + 1, first_byte_ms: Math.round(first ?? total), total_ms: Math.round(total), reply_bytes: bytes });
}
console.table(rows);

// The last message asks for a sketch. Wait for the background job.
if (skissSteg) {
  const t0 = performance.now();
  let rad = null;
  while (performance.now() - t0 < 180_000) {
    const alla = await (await must(await fetch(
      `${URL_}/rest/v1/skiss?projekt_id=eq.${projekt.id}&select=status,ms,modell,masker,fel,beskrivning&order=skapad.desc`, { headers: h },
    ), "read sketch")).json();
    if (alla.length > 1) console.log(`Note: ${alla.length} sketches, only the last message asked for one (S12).`);
    rad = alla[0] ?? null;
    if (rad && (rad.status === "klar" || rad.status === "fel")) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!rad) {
    console.log("Sketch: the advisor did not ask for one (or sketches are off: FAL_KEY missing).");
  } else {
    console.table([{ status: rad.status, beskrivning: rad.beskrivning, modell: rad.modell, masker: rad.masker?.length ?? 0,
      ms: rad.ms, vantat_ms: Math.round(performance.now() - t0), fel: rad.fel ?? "" }]);
    if (rad.status !== "klar") process.exitCode = 1;
  }
}
