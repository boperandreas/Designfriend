/**
 * Dictation helpers around the browser's speech recognition. Kept free of
 * React and DOM side effects on import so the text logic can be tested.
 */

export interface ResultLike { isFinal: boolean; 0: { transcript: string } }

/** Joins what was already typed with everything heard so far in this session. */
export function combine(base: string, results: ArrayLike<ResultLike>): string {
  let heard = ''
  for (let i = 0; i < results.length; i++) heard += results[i][0].transcript
  heard = heard.replace(/\s+/g, ' ').trim()
  if (!heard) return base
  const b = base.replace(/\s+$/, '')
  return b ? `${b} ${heard}` : heard.charAt(0).toUpperCase() + heard.slice(1)
}

/** Swedish message for a recognition error, or null when it should be silent. */
export function felText(error: string): string | null {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Appen fick inte använda mikrofonen. Tillåt mikrofonen för sidan i telefonens inställningar, eller använd mikrofonen på tangentbordet.'
    case 'audio-capture':
      return 'Ingen mikrofon hittades.'
    case 'network':
      return 'Dikteringen behöver uppkoppling. Försök igen.'
    case 'no-speech':
    case 'aborted':
      return null
    default:
      return 'Dikteringen fungerade inte. Använd gärna mikrofonen på tangentbordet i stället.'
  }
}
