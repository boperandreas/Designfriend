import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { supabase, type Bild, type Meddelande } from '../lib/supabase'
import { signedUrls, uploadImage } from '../lib/bilder'
import { sendMessage } from '../lib/chat'
import { Svar } from './Svar'

interface Bilaga { id: string; url: string; typ: Bild['typ'] }

export function Chat({ projektId }: { projektId: string }) {
  const [meddelanden, setMeddelanden] = useState<Meddelande[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [bilagor, setBilagor] = useState<Bilaga[]>([])
  const [text, setText] = useState('')
  const [laddar, setLaddar] = useState(true)
  const [laddarUpp, setLaddarUpp] = useState(0)
  const [svarar, setSvarar] = useState(false)
  const [fel, setFel] = useState<string | null>(null)
  const slut = useRef<HTMLDivElement>(null)
  const rumInput = useRef<HTMLInputElement>(null)
  const moodInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let aktiv = true
    setLaddar(true)
    setMeddelanden([])
    Promise.all([
      supabase.from('meddelande').select('id,roll,text,bilder,skapad').eq('projekt_id', projektId)
        .order('skapad', { ascending: true }).limit(300),
      supabase.from('bild').select('id,typ,sokvag').eq('projekt_id', projektId),
    ]).then(async ([m, b]) => {
      if (!aktiv) return
      setMeddelanden((m.data ?? []) as Meddelande[])
      setUrls(await signedUrls((b.data ?? []) as Bild[]))
      setLaddar(false)
    })
    return () => { aktiv = false }
  }, [projektId])

  useEffect(() => {
    slut.current?.scrollIntoView({ block: 'end' })
  }, [meddelanden, laddar])

  async function valjBilder(e: ChangeEvent<HTMLInputElement>, typ: Bild['typ']) {
    const filer = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!filer.length) return
    setFel(null)
    setLaddarUpp((n) => n + filer.length)
    for (const fil of filer) {
      try {
        const bild = await uploadImage(fil, projektId, typ)
        const url = URL.createObjectURL(fil)
        setUrls((u) => ({ ...u, [bild.id]: url }))
        setBilagor((b) => [...b, { id: bild.id, url, typ }])
      } catch (err) {
        setFel(err instanceof Error ? err.message : 'Bilden kunde inte laddas upp.')
      } finally {
        setLaddarUpp((n) => n - 1)
      }
    }
  }

  async function skicka() {
    const t = text.trim()
    if ((!t && !bilagor.length) || svarar) return
    const ids = bilagor.map((b) => b.id)
    setText('')
    setBilagor([])
    setFel(null)
    setSvarar(true)
    setMeddelanden((m) => [...m, { roll: 'user', text: t || '(bilder)', bilder: ids }, { roll: 'assistant', text: '', bilder: [] }])
    try {
      await sendMessage(projektId, t, ids, (full) => {
        setMeddelanden((m) => {
          const kopia = m.slice()
          kopia[kopia.length - 1] = { roll: 'assistant', text: full, bilder: [] }
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
        {meddelanden.map((m, i) => (
          <div key={m.id ?? `ny-${i}`} className={`msg ${m.roll === 'user' ? 'me' : 'ai'}`}>
            {m.bilder?.length > 0 && (
              <div className="thumbs">
                {m.bilder.map((id) => urls[id] ? <img key={id} src={urls[id]} alt="" /> : null)}
              </div>
            )}
            {m.roll === 'assistant'
              ? (m.text ? <Svar text={m.text} /> : <p className="muted tänker">Tänker…</p>)
              : m.text !== '(bilder)' && <p>{m.text}</p>}
          </div>
        ))}
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
          <button type="button" className="primary" onClick={skicka}
            disabled={svarar || laddarUpp > 0 || (!text.trim() && !bilagor.length)}>
            Skicka
          </button>
        </div>
      </div>
    </div>
  )
}
