import { useEffect, useState } from 'react'
import { composeSketch, type Skiss } from '../lib/skiss'

/** One idea sketch in the conversation: waiting, failed, or before/after. */
export function SkissKort({ skiss, originalPath }: { skiss: Skiss; originalPath: string | undefined }) {
  const [bild, setBild] = useState<{ efter: string; fore: string } | null>(null)
  const [fore, setFore] = useState(false)
  const [fel, setFel] = useState<string | null>(null)

  useEffect(() => {
    if (skiss.status !== 'klar' || !originalPath) return
    let aktiv = true
    composeSketch(skiss, originalPath)
      .then((b) => { if (aktiv) setBild(b) })
      .catch((e) => { if (aktiv) setFel(e instanceof Error ? e.message : 'Kunde inte visa skissen.') })
    return () => { aktiv = false }
  }, [skiss, originalPath])

  useEffect(() => () => {
    if (bild) { URL.revokeObjectURL(bild.efter); URL.revokeObjectURL(bild.fore) }
  }, [bild])

  if (skiss.status === 'fel') {
    return <div className="skiss"><p className="fel">{skiss.fel ?? 'Skissen gick inte att göra.'}</p></div>
  }
  if (skiss.status !== 'klar' || (!bild && !fel)) {
    return (
      <div className="skiss vantar" aria-live="polite">
        <p className="muted">Ritar skissen: {skiss.beskrivning}. Det tar ungefär en halv minut.</p>
      </div>
    )
  }
  if (fel || !bild) return <div className="skiss"><p className="fel">{fel}</p></div>

  return (
    <figure className="skiss">
      <button type="button" className="skiss-bild" onClick={() => setFore((f) => !f)}
        aria-label={fore ? 'Visa skissen' : 'Visa fotot som det är i dag'}>
        <img src={fore ? bild.fore : bild.efter} alt={fore ? 'Rummet i dag' : `Idéskiss: ${skiss.beskrivning}`} />
        <span className="skiss-etikett">{fore ? 'I dag' : 'Skiss'}</span>
      </button>
      <figcaption>
        <b>{skiss.beskrivning}</b>
        <span className="muted small">AI-skiss · tryck för att jämföra</span>
      </figcaption>
    </figure>
  )
}
