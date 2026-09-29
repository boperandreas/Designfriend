import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase'

/** Send one message and stream the advisor's reply, chunk by chunk. */
export async function sendMessage(
  projektId: string,
  text: string,
  bildIds: string[],
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Du behöver logga in igen.')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projekt_id: projektId, text, bild_ids: bildIds }),
    signal,
  })

  if (!res.ok || !res.body) {
    let message = 'Vännen svarar inte just nu. Försök igen om en stund.'
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch { /* keep default */ }
    throw new Error(message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    full += decoder.decode(value, { stream: true })
    onText(full)
  }
  full += decoder.decode()
  onText(full)
  return full
}
