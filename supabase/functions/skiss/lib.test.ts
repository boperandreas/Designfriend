import assert from "node:assert/strict";
import { cleanOmraden, editInput, editPrompt, pickMasks } from "./lib.ts";

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
  assert.equal(editInput("fal-ai/nano-banana-2/edit", "x", "u").resolution, "1K");
  assert.equal(editInput("openai/gpt-image-2/edit", "x", "u").quality, "medium");
  assert.equal(editInput("fal-ai/flux-2-pro/edit", "x", "u").num_images, undefined);
});
