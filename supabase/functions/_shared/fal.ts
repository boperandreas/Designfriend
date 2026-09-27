// Calls to fal.ai, which hosts the segmentation model (SAM 3) and the image
// models. One key (FAL_KEY) gives access to all of them.
//
// Privacy: by default fal keeps generated files forever and publicly
// readable. Every call asks for files to expire after ten minutes and for
// request payloads not to be stored. We copy what we need to our own storage
// right away.

const FAL_RUN = "https://fal.run";

export const FAL_HEADERS = {
  "X-Fal-Object-Lifecycle-Preference": JSON.stringify({ expiration_duration_seconds: 600 }),
  "X-Fal-Store-IO": "0",
};

// deno-lint-ignore no-explicit-any
export type FalResult = Record<string, any>;

/** Run a model synchronously and return its JSON output. */
export async function runFal(
  endpoint: string,
  input: Record<string, unknown>,
  apiKey: string,
  timeoutMs = 120_000,
): Promise<FalResult> {
  const res = await fetch(`${FAL_RUN}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${apiKey}`, "Content-Type": "application/json", ...FAL_HEADERS },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`fal ${endpoint} ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return await res.json();
}

/** Download a file fal produced. */
export async function fetchFile(url: string): Promise<Blob> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return await res.blob();
}
