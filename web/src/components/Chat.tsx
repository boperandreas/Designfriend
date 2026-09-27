import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { supabase, type Bild, type Meddelande } from '../lib/supabase'
import { Dubblett, signedUrls, uploadImage } from '../lib/bilder'
import { unsentImages } from '../lib/bilaga'
import { SKISS_FALT, utanSkissNotis, type Skiss } from '../lib/skiss'
import { SkissKort } from './SkissKort'
import { sendMessage } from '../lib/chat'
import { Svar } from './Svar'
import { Diktera } from './Diktera'

interface Bilaga { id: string; url: string; typ: Bild['typ'] }

export function Chat({ projektId }: { projektId: string }) {
  const [meddelanden, setMeddelanden] = useState<Meddelande[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [vagar, setVagar] = useState<Record<string, string>>({})
  const [skisser, setSkisser] = useState<Skiss[]>([])
  const [bilagor, setBilagor] = useState<Bilaga[]>([])
  const [text, setText] = useState('')
  const [laddar, setLaddar] = useState(true)
  const [laddarUpp, setLaddarUpp] = useState(0)
  const [svarar, setSvarar] = useState(false)
  const [fel, setFel] = useState<string | null>(null)
  const [avbryt, setAvbryt] = useState(0)
  const slut = useRef<HTMLDivElement>(null)
  const rumInput = useRef<HTMLInputElement>(null)
  const moodInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let aktiv = true
    setLaddar(true)
    setMeddelanden([])
    setSkisser([])
    Promise.all([
      supabase.from('meddelande').select('id,roll,text,bilder,skapad').eq('projekt_id', projektId)
        .order('skapad', { ascending: true }).limit(300),
      supabase.from('bild').select('id,typ,sokvag,skapad').eq('projekt_id', projektId),
      supabase.from('skiss').select(SKISS_FALT).eq('projekt_id', projektId).order('skapad', { ascending: true }),
    ]).then(async ([m, b, sk]) => {
      if (!aktiv) return
      const medd = (m.data ?? []) as Meddelande[]
      const bilder = (b.data ?? []) as Bild[]
      const u = await signedUrls(bilder)
      if (!aktiv) return
      setMeddelanden(medd)
      setUrls(u)
      setVagar(Object.fromEntries(bilder.map((x) => [x.id, x.sokvag])))
      setSkisser((sk.data ?? []) as Skiss[])
      // Photos uploaded but not yet sent come back to the composer.
      setBilagor(unsentImages(bilder.map((x) => ({ ...x, skapad: x.skapad ?? '' })), medd)
        .map((x) => ({ id: x.id, url: u[x.id], typ: x.typ })).filter((x) => x.url))
      setLaddar(false)
    })
    return () => { aktiv = false }
  }, [projektId])

  // Sketches arrive in the background: Realtime, plus polling while one is on
  // its way, since a phone may drop the socket when the app is in the background.
  const vantar = skisser.some((x) => x.status === 'ny' || x.status === 'pagar')
  useEffect(() => {
    const upsert = (rad: Skiss) => setSkisser((lista) => {
      const i = lista.findIndex((x) => x.id === rad.id)
      if (i === -1) return [...lista, rad]
      const kopia = lista.slice()
      kopia[i] = rad
      return kopia
    })
    const kanal = supabase.channel(`skiss-${projektId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skiss', filter: `projekt_id=eq.${projektId}` },
        (p) => { if (p.new && 'id' in p.new) upsert(p.new as Skiss) })
      .subscribe()
    return () => { supabase.removeChannel(kanal) }
  }, [projektId])

  useEffect(() => {
    if (!vantar && !svarar) return
    const t = setInterval(async () => {
      const { data } = await supabase.from('skiss').select(SKISS_FALT).eq('projekt_id', projektId).order('skapad', { ascending: true })
      if (data) setSkisser(data as Skiss[])
    }, 4000)
    return () => clearInterval(t)
  }, [vantar, svarar, projektId])

  const flode = useMemo(() => {
    type Rad = { tid: string; m?: Meddelande; s?: Skiss; i: number }
    const rader: Rad[] = [
      ...meddelanden.map((m, i) => ({ tid: m.skapad ?? '', m, i })),
      ...skisser.map((s, i) => ({ tid: s.skapad, s, i: meddelanden.length + i })),
    ]
    return rader.sort((a, b) => (a.tid === b.tid ? a.i - b.i : new Date(a.tid).getTime() - new Date(b.tid).getTime()))
  }, [meddelanden, skisser])

  useEffect(() => {
    slut.current?.scrollIntoView({ block: 'end' })
  }, [meddelanden, skisser, laddar])

  async function valjBilder(e: ChangeEvent<HTMLInputElement>, typ: Bild['typ']) {
    const filer = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!filer.length) return
    setFel(null)
    setLaddarUpp((n) => n + filer.length)
    let dubbletter = 0
    for (const fil of filer) {
      try {
        const bild = await uploadImage(fil, projektId, typ)
        const url = URL.createObjectURL(fil)
        setUrls((u) => ({ ...u, [bild.id]: url }))
        setBilagor((b) => [...b, { id: bild.id, url, typ }])
      } catch (err) {
        if (err instanceof Dubblett) dubbletter++
        else setFel(err instanceof Error ? err.message : 'Bilden kunde inte laddas upp.')
      } finally {
        setLaddarUpp((n) => n - 1)
      }
    }
    if (dubbletter) setFel(dubbletter === 1 ? 'Den bilden finns redan i rummet.' : `${dubbletter} av bilderna finns redan i rummet.`)
  }

  async function skicka() {
    const t = text.trim()
    if ((!t && !bilagor.length) || svarar) return
    const ids = bilagor.map((b) => b.id)
    setAvbryt((n) => n + 1)
    setText('')
    setBilagor([])
    setFel(null)
    setSvarar(true)
    const nu = new Date().toISOString()
    setMeddelanden((m) => [...m, { roll: 'user', text: t || '(bilder)', bilder: ids, skapad: nu }, { roll: 'assistant', text: '', bilder: [], skapad: nu }])
    try {
      await sendMessage(projektId, t, ids, (full) => {
        setMeddelanden((m) => {
          const kopia = m.slice()
          kopia[kopia.length - 1] = { ...kopia[kopia.length - 1], text: full }
          return kopia
        })
      })
    } catch (err) {
      setFel(err instanceof Error ? err.message : 'Något gick fel. Försök igen.')
      setMeddelanden((m) => (m[m.length - 1]?.text ? m : m.slice(0, -1)))
    } finally {
      setSvarar(false)
    }
  }

  const tomt = !laddar && meddelanden.length === 0

  return (
    <div className="chat">
      <div className="messages" aria-live="polite">
        {laddar && <p className="muted center">Hämtar samtalet…</p>}
        {tomt && (
          <div className="intro">
            <p><strong>Börja med ett foto av rummet.</strong> Lägg gärna till några bilder du gillar, och skriv med egna ord vad du vill ändra eller hur det ska kännas.</p>
          </div>
        )}
        {flode.map(({ m, s, i }) => {
          if (s) return <SkissKort key={s.id} skiss={s} originalPath={s.kalla_bild_id ? vagar[s.kalla_bild_id] : undefined} />
          if (!m) return null
          const text = m.roll === 'assistant' ? utanSkissNotis(m.text) : m.text
          if (m.roll === 'assistant' && !text && m.text) return null
          return (
            <div key={m.id ?? `ny-${i}`} className={`msg ${m.roll === 'user' ? 'me' : 'ai'}`}>
              {m.bilder?.length > 0 && (
                <div className="thumbs">
                  {m.bilder.map((id) => urls[id] ? <img key={id} src={urls[id]} alt="" /> : null)}
                </div>
              )}
              {m.roll === 'assistant'
                ? (text ? <Svar text={text} /> : <p className="muted tänker">Tänker…</p>)
                : text !== '(bilder)' && <p>{text}</p>}
            </div>
          )
        })}
        <div ref={slut} />
      </div>

      <div className="composer">
        {fel && <p className="fel" role="alert">{fel}</p>}
        {(bilagor.length > 0 || laddarUpp > 0) && (
          <div className="bilagor">
            {bilagor.map((b) => (
              <figure key={b.id}>
                <img src={b.url} alt="" />
                <figcaption>{b.typ === 'rum' ? 'Rummet' : 'Moodboard'}</figcaption>
              </figure>
            ))}
            {laddarUpp > 0 && <span className="muted small">Laddar upp {laddarUpp}…</span>}
          </div>
        )}
        <div className="attach">
          <button type="button" onClick={() => rumInput.current?.click()}>Foto av rummet</button>
          <button type="button" onClick={() => moodInput.current?.click()}>Bilder jag gillar</button>
          <input ref={rumInput} type="file" accept="image/*" multiple hidden onChange={(e) => valjBilder(e, 'rum')} />
          <input ref={moodInput} type="file" accept="image/*" multiple hidden onChange={(e) => valjBilder(e, 'moodboard')} />
        </div>
        <div className="input-row">
          <label htmlFor="meddelande" className="sr-only">Meddelande</label>
          <textarea
            id="meddelande" rows={1} placeholder="Skriv till vännen…" value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); skicka() } }}
          />
          <Diktera text={text} onText={setText} onFel={setFel} disabled={svarar} avbryt={avbryt} />
          <button type="button" className="primary" onClick={skicka}
            disabled={svarar || laddarUpp > 0 || (!text.trim() && !bilagor.length)}>
            Skicka
          </button>
        </div>
      </div>
    </div>
  )
}
