export interface BildRad { id: string; skapad: string }
export interface MeddelandeRad { bilder?: string[] | null; skapad?: string }

/**
 * Photos uploaded after the last message but never sent with one. They were
 * shown only in the composer, so closing the app hid them and invited a
 * second upload. Returned in upload order so the composer can show them again.
 */
export function unsentImages<T extends BildRad>(bilder: T[], meddelanden: MeddelandeRad[]): T[] {
  const skickade = new Set(meddelanden.flatMap((m) => m.bilder ?? []))
  const senast = meddelanden.reduce((max, m) => (m.skapad && m.skapad > max ? m.skapad : max), '')
  return bilder
    .filter((b) => !skickade.has(b.id) && b.skapad > senast)
    .sort((a, b) => a.skapad.localeCompare(b.skapad))
}

export async function sha256(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
