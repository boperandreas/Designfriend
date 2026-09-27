import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// The memory is written by a model, so every field is read defensively.
type Rad = Record<string, unknown>
const s = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function Sektion({ titel, children }: { titel: string; children: React.ReactNode }) {
  return <section><h3>{titel}</h3>{children}</section>
}

export function VarViAr({ projektId, onClose }: { projektId: string; onClose: () => void }) {
  const [minne, setMinne] = useState<Rad | null | undefined>(undefined)
  const [uppdaterad, setUppdaterad] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('projektminne').select('innehall,uppdaterad').eq('projekt_id', projektId).maybeSingle()
      .then(({ data }) => {
        setMinne((data?.innehall as Rad) ?? null)
        setUppdaterad(data?.uppdaterad ?? null)
      })
  }, [projektId])

  const m = minne ?? {}
  const beslut = lista(m['beslut']) as Rad[]
  const provat = lista(m['prövat']) as Rad[]
  const oppna = lista(m['öppna_frågor']) as Rad[]
  const behalls = lista(m['behålls']).map(s)
  const stabilt = lista(m['stabilt_över_versioner']).map(s)
  const praktiskt = lista(m['praktiskt']).map(s)
  const tomt = minne !== undefined && !beslut.length && !provat.length && !oppna.length && !s(m['mål']) && !s(m['pågående'])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside className="sheet" onClick={(e) => e.stopPropagation()} aria-label="Var vi är">
        <header className="sheet-head">
          <h2>Var vi är</h2>
          <button className="link" onClick={onClose}>Stäng</button>
        </header>
        {minne === undefined && <p className="muted">Hämtar…</p>}
        {tomt && <p className="muted">Här samlas det ni kommit fram till när ni pratat en stund.</p>}
        {!!s(m['mål']) && <Sektion titel="Målet"><p>{s(m['mål'])}</p></Sektion>}
        {!!s(m['pågående']) && <Sektion titel="Just nu"><p>{s(m['pågående'])}</p></Sektion>}
        {beslut.length > 0 && (
          <Sektion titel="Bestämt">
            <ul>{beslut.map((b, i) => (
              <li key={i}><strong>{s(b['vad'])}</strong>{s(b['varför']) && <span className="muted"> · {s(b['varför'])}</span>}
                {b['lätt_att_ändra'] === true && <span className="chip">lätt att ändra</span>}</li>
            ))}</ul>
          </Sektion>
        )}
        {behalls.length > 0 && <Sektion titel="Behålls"><p>{behalls.join(', ')}</p></Sektion>}
        {oppna.length > 0 && (
          <Sektion titel="Öppet">
            <ul>{oppna.map((o, i) => (
              <li key={i}>{s(o['fråga'])}{s(o['nästa_steg']) && <span className="muted"> · {s(o['nästa_steg'])}</span>}</li>
            ))}</ul>
          </Sektion>
        )}
        {provat.length > 0 && (
          <Sektion titel="Prövat">
            <ul>{provat.map((p, i) => (
              <li key={i}>{s(p['vad'])}<span className="chip">{s(p['utfall'])}</span>
                {s(p['citat']) && <span className="muted"> ”{s(p['citat'])}”</span>}</li>
            ))}</ul>
          </Sektion>
        )}
        {stabilt.length > 0 && <Sektion titel="Har legat fast"><p>{stabilt.join(', ')}</p></Sektion>}
        {praktiskt.length > 0 && <Sektion titel="Bra att veta"><ul>{praktiskt.map((p, i) => <li key={i}>{p}</li>)}</ul></Sektion>}
        {uppdaterad && <p className="muted small">Uppdaterat {new Date(uppdaterad).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
      </aside>
    </div>
  )
}
