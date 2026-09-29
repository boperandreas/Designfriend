import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, SUPABASE_URL, SUPABASE_KEY, type Projekt } from './lib/supabase'
import { Login } from './components/Login'
import { Chat } from './components/Chat'
import { VarViAr } from './components/VarViAr'
import { Hemskarm } from './components/Hemskarm'

const VALT = 'df-valt-projekt'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <main className="login"><p className="muted">Startar…</p></main>
  if (!session) return <><Hemskarm /><Login /></>
  return <><Hemskarm /><Inloggad /></>
}

function Inloggad() {
  const [projekt, setProjekt] = useState<Projekt[]>([])
  const [valt, setValt] = useState<string | null>(null)
  const [visaMinne, setVisaMinne] = useState(false)
  const [meny, setMeny] = useState(false)
  const [nyttNamn, setNyttNamn] = useState('')
  const [raderaSteg, setRaderaSteg] = useState(false)
  const [fel, setFel] = useState<string | null>(null)

  const startat = useRef(false)

  useEffect(() => {
    if (startat.current) return // StrictMode runs effects twice in development
    startat.current = true
    ;(async () => {
      const { data } = await supabase.from('projekt').select('id,namn,skapad').order('skapad', { ascending: true })
      let lista = (data ?? []) as Projekt[]
      if (!lista.length) {
        const { data: nytt } = await supabase.from('projekt').insert({ namn: 'Mitt rum' }).select('id,namn,skapad').single()
        if (nytt) lista = [nytt as Projekt]
      }
      setProjekt(lista)
      let sparat: string | null = null
      try { sparat = localStorage.getItem(VALT) } catch { /* ignore */ }
      setValt(lista.find((p) => p.id === sparat)?.id ?? lista[lista.length - 1]?.id ?? null)
    })()
  }, [])

  function valj(id: string) {
    setValt(id)
    try { localStorage.setItem(VALT, id) } catch { /* ignore */ }
  }

  async function skapaRum(e: FormEvent) {
    e.preventDefault()
    const namn = nyttNamn.trim()
    if (!namn) return
    const { data, error } = await supabase.from('projekt').insert({ namn }).select('id,namn,skapad').single()
    if (error || !data) { setFel('Rummet kunde inte skapas.'); return }
    setProjekt((p) => [...p, data as Projekt])
    valj((data as Projekt).id)
    setNyttNamn('')
    setMeny(false)
  }

  async function raderaKonto() {
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/radera-konto`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session?.access_token}`, apikey: SUPABASE_KEY },
    })
    if (!res.ok) { setFel('Kontot kunde inte raderas. Försök igen.'); return }
    try { localStorage.clear() } catch { /* ignore */ }
    await supabase.auth.signOut()
  }

  const aktuellt = projekt.find((p) => p.id === valt)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-titel">
          <span className="kicker">Designfriend</span>
          {projekt.length > 1 ? (
            <select aria-label="Rum" value={valt ?? ''} onChange={(e) => valj(e.target.value)}>
              {projekt.map((p) => <option key={p.id} value={p.id}>{p.namn}</option>)}
            </select>
          ) : <h1>{aktuellt?.namn ?? 'Designfriend'}</h1>}
        </div>
        <div className="topbar-actions">
          <button className="ghost" onClick={() => setVisaMinne(true)} disabled={!valt}>Var vi är</button>
          <button className="ghost" onClick={() => setMeny((m) => !m)} aria-expanded={meny}>Mer</button>
        </div>
      </header>

      {meny && (
        <div className="meny">
          <form onSubmit={skapaRum} className="nytt-rum">
            <label htmlFor="nytt">Nytt rum</label>
            <input id="nytt" placeholder="Till exempel Sovrummet" value={nyttNamn} onChange={(e) => setNyttNamn(e.target.value)} />
            <button type="submit" disabled={!nyttNamn.trim()}>Skapa</button>
          </form>
          <button className="link" onClick={() => supabase.auth.signOut()}>Logga ut</button>
          {!raderaSteg ? (
            <button className="link fara" onClick={() => setRaderaSteg(true)}>Radera mitt konto</button>
          ) : (
            <div className="bekrafta">
              <p>Allt raderas: rum, foton, samtal och det vännen minns. Det går inte att ångra.</p>
              <button className="fara-knapp" onClick={raderaKonto}>Radera allt</button>
              <button className="link" onClick={() => setRaderaSteg(false)}>Avbryt</button>
            </div>
          )}
          {fel && <p className="fel" role="alert">{fel}</p>}
        </div>
      )}

      {valt && <Chat key={valt} projektId={valt} />}
      {visaMinne && valt && <VarViAr projektId={valt} onClose={() => setVisaMinne(false)} />}
    </div>
  )
}
