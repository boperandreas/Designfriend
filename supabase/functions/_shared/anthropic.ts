// Small helpers for Anthropic's API, shared by the edge functions.

export const ANTHROPIC_API = "https://api.anthropic.com/v1";

export function anthropicHeaders(apiKey: string): Record<string, string> {
  return { "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
}

/**
 * Uploads an image to the Files API once. Referencing the returned id keeps
 * the request small and identical between turns, so the prompt cache hits.
 */
export async function uploadFile(blob: Blob, filename: string, apiKey: string): Promise<string> {
  const form = new FormData();
  form.append("file", blob, filename);
  const res = await fetch(`${ANTHROPIC_API}/files`, {
    method: "POST",
    headers: anthropicHeaders(apiKey),
    body: form,
  });
  if (!res.ok) throw new Error(`file upload failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.id as string;
}

export async function deleteFile(fileId: string, apiKey: string): Promise<void> {
  const res = await fetch(`${ANTHROPIC_API}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: anthropicHeaders(apiKey),
  });
  if (!res.ok && res.status !== 404) console.error("file delete failed", fileId, res.status);
}
