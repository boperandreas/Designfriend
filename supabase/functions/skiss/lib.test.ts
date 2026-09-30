import assert from "node:assert/strict";
import { cleanOmraden, cleanPlatser, editInput, editPrompt, headNoun, pickMasks, withRetry } from "./lib.ts";

Deno.test("headNoun keeps the last word of a phrase", () => {
  assert.equal(headNoun("dark grey armchair"), "armchair");
  assert.equal(headNoun("rug"), null);
  assert.equal(headNoun("rug area in front of sofa"), null);
  assert.equal(headNoun("area on rug"), null);
  assert.equal(headNoun("white footstool"), "footstool");
});

Deno.test("cleanPlatser clamps boxes and drops nonsense", () => {
  assert.deepEqual(cleanPlatser([{ x: 30, y: 55, bredd: 30, hojd: 20 }, { x: 90, y: 90, bredd: 30, hojd: 30 }, { x: "a" }, null]),
    [{ x: 30, y: 55, bredd: 30, hojd: 20 }, { x: 90, y: 90, bredd: 10, hojd: 10 }]);
  assert.deepEqual(cleanPlatser("x"), []);
});

Deno.test("editInput sends references after the photo", () => {
  const input = editInput("fal-ai/nano-banana-2/edit", "Add the table from the second image.", "rum", ["bord"]);
  assert.deepEqual(input.image_urls, ["rum", "bord"]);
  assert.equal(input.resolution, "2K");
  assert.ok(String(input.prompt).startsWith("The first image is the photo of the room"));
  assert.ok(!editPrompt("x").includes("references"));
});

Deno.test("cleanOmraden trims, dedupes and caps", () => {
  assert.deepEqual(cleanOmraden([" dark armchair ", "Dark armchair", "", 3, "footstool", "rug", "lamp", "plant"]),
    ["dark armchair", "footstool", "rug", "lamp"]);
  assert.deepEqual(cleanOmraden("armchair"), []);
});

Deno.test("pickMasks keeps strong masks, else the best one", () => {
  const out = { masks: [{ url: "a" }, { url: "b" }, { url: "c" }], scores: [0.2, 0.9, 0.5] };
  assert.deepEqual(pickMasks(out), ["b", "c"]);
  assert.deepEqual(pickMasks({ masks: [{ url: "x" }, { url: "y" }], scores: [0.1, 0.3] }), ["y"]);
  assert.deepEqual(pickMasks({}), []);
});

Deno.test("editPrompt asks to keep the rest", () => {
  const p = editPrompt("Remove the dark armchair.");
  assert.ok(p.startsWith("Remove the dark armchair."));
  assert.ok(p.includes("unchanged"));
});

Deno.test("editInput adapts to the model", () => {
  assert.equal(editInput("fal-ai/nano-banana-2/edit", "x", "u").resolution, "2K");
  assert.equal(editInput("openai/gpt-image-2/edit", "x", "u").quality, "medium");
  assert.equal(editInput("fal-ai/flux-2-pro/edit", "x", "u").num_images, undefined);
});

Deno.test("withRetry tries again after a failure", async () => {
  let n = 0;
  const v = await withRetry(async () => { if (++n < 3) throw new Error("Too many connections"); return "ok"; }, 4, () => 0);
  assert.equal(v, "ok");
  assert.equal(n, 3);
  await assert.rejects(withRetry(async () => { throw new Error("x"); }, 2, () => 0));
});
