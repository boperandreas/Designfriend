import { supabase, SUPABASE_KEY, SUPABASE_URL } from './supabase'
import { blend, boxAround, coverage, diffMask, dilate, erode, feather, fillBoxes, margins, maskFromRGBA, upscale, type Plats } from './komposit'

export interface Skiss {
  id: string
  kalla_bild_id: string | null
  beskrivning: string
  status: 'forslag' | 'ny' | 'pagar' | 'klar' | 'fel'
  sokvag: string | null
  masker: string[]
  platser?: Plats[]
  grund_sokvag?: string | null
  visad_sokvag?: string | null
  fel: string | null
  skapad: string
}

export const SKISS_FALT = 'id,kalla_bild_id,beskrivning,status,sokvag,masker,platser,grund_sokvag,visad_sokvag,fel,skapad'

/** Remove the note the server adds to a reply when it orders a sketch. */
export function utanSkissNotis(text: string): string {
  return text.replace(/\s*\[Skiss (beställd|föreslagen): [^\]]*\]\s*$/, '').trim()
}

/** Start a sketch the advisor suggested, when the user taps it. */
export async function startaSkiss(id: string): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Du behöver logga in igen.')
  const res = await fetch(`${SUPABASE_URL}/functions/v1/skiss`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ skiss_id: id }),
  })
  if (res.status !== 202 && res.status !== 409) throw new Error('Skissen gick inte att starta. Försök igen.')
}

async function retry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) { last = e; await new Promise((r) => setTimeout(r, 400 * 2 ** i)) }
  }
  throw last
}

/**
 * Fetch images one at a time, with retries. The free Supabase plan allows few
 * connections, and a conversation with several sketches used to fetch 20 to 30
 * files at once.
 */
async function bitmaps(paths: string[]): Promise<ImageBitmap[]> {
  const { data, error } = await retry(async () => {
    const r = await supabase.storage.from('bilder').createSignedUrls(paths, 600)
    if (r.error || !r.data) throw r.error ?? new Error('no urls')
    return r
  })
  if (error || !data) throw new Error('Kunde inte hämta skissen.')
  const out: ImageBitmap[] = []
  for (const d of data) {
    if (!d.signedUrl) throw new Error('Kunde inte hämta skissen.')
    const url = d.signedUrl
    out.push(await retry(async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`fetch ${res.status}`)
      return createImageBitmap(await res.blob())
    }).catch(() => { throw new Error('Kunde inte hämta skissen.') }))
  }
  return out
}

// One sketch is put together at a time.
let ko: Promise<unknown> = Promise.resolve()
function iTur<T>(fn: () => Promise<T>): Promise<T> {
  const p = ko.then(fn, fn)
  ko = p.catch(() => undefined)
  return p
}

function pixels(ctx: CanvasRenderingContext2D, img: ImageBitmap, w: number, h: number): Uint8ClampedArray {
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h).data
}

/**
 * Build the sketch shown to the user: the generated image inside the masks,
 * the original photo everywhere else. Returns object URLs for the sketch and
 * the original, so the card can switch between before and after.
 */
export function composeSketch(s: Skiss, originalPath: string): Promise<{ efter: string; fore: string }> {
  return iTur(() => (s.visad_sokvag ? loadShown(s, originalPath) : compose(s, originalPath)))
}

/** A sketch already put together: two images, before and after. */
async function loadShown(s: Skiss, originalPath: string): Promise<{ efter: string; fore: string }> {
  const [fore, efter] = await bitmaps([originalPath, s.visad_sokvag!])
  const out = { fore: await bitmapUrl(fore), efter: await bitmapUrl(efter) }
  fore.close(); efter.close()
  return out
}

async function bitmapUrl(b: ImageBitmap): Promise<string> {
  const c = document.createElement('canvas')
  c.width = b.width; c.height = b.height
  c.getContext('2d')!.drawImage(b, 0, 0)
  return toUrl(c)
}

async function compose(s: Skiss, originalPath: string): Promise<{ efter: string; fore: string }> {
  if (!s.sokvag) throw new Error('Skissen saknas.')
  const [original, generated, ...masks] = await bitmaps([originalPath, s.sokvag, ...s.masker])
  const w = original.width
  const h = original.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Kunde inte visa skissen.')

  const orig = pixels(ctx, original, w, h)
  const fore = await toUrl(canvas)

  const union = new Uint8Array(w * h)
  for (const m of masks) {
    const one = maskFromRGBA(pixels(ctx, m, w, h))
    if (coverage(one) > 0.9) continue // an inverted or broken mask would restore nothing
    boxAround(one, w, h, 0.05, union)
  }
  // Where something new is placed, for example a table in front of the sofa.
  fillBoxes(union, w, h, Array.isArray(s.platser) ? s.platser : [])
  if (coverage(union) === 0) diffFallback(original, generated, w, h, union)
  const gen = pixels(ctx, generated, w, h)
  if (coverage(union) > 0) {
    const { grow, soft } = margins(w, h)
    const alpha = feather(dilate(union, w, h, grow), w, h, soft)
    ctx.putImageData(new ImageData(blend(orig, gen, alpha), w, h), 0, 0)
  }
  // If the whole room changed (a new style for everything) it is shown as it is.
  for (const b of [original, generated, ...masks]) b.close()
  const efter = await toUrl(canvas)
  sparaVisad(s, canvas).catch(() => undefined)
  return { efter, fore }
}

/**
 * Keep the sketch as it is shown, so the next sketch can build on it and it
 * opens faster next time. Best effort: showing it never waits for this.
 */
async function sparaVisad(s: Skiss, canvas: HTMLCanvasElement): Promise<void> {
  if (!s.sokvag) return
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9))
  if (!blob) return
  const vag = s.sokvag.replace(/\.jpg$/, '-visad.jpg')
  await retry(async () => {
    const r = await supabase.storage.from('bilder').upload(vag, blob, { contentType: 'image/jpeg', upsert: true })
    if (r.error) throw r.error
  })
  await retry(async () => {
    const r = await supabase.from('skiss').update({ visad_sokvag: vag }).eq('id', s.id)
    if (r.error) throw r.error
  })
}

/**
 * No mask from SAM: compare small versions of the two images and treat the
 * clearly changed regions as the mask. Leaves the mask empty when most of the
 * image changed, since then the model was asked to change the whole room.
 */
function diffFallback(original: ImageBitmap, generated: ImageBitmap, w: number, h: number, into: Uint8Array) {
  const sw = Math.max(1, Math.round(w / 8))
  const sh = Math.max(1, Math.round(h / 8))
  const small = document.createElement('canvas')
  small.width = sw
  small.height = sh
  const c = small.getContext('2d', { willReadFrequently: true })
  if (!c) return
  c.imageSmoothingQuality = 'high'
  const a = pixels(c, original, sw, sh)
  const b = pixels(c, generated, sw, sh)
  const m = dilate(erode(diffMask(a, b), sw, sh, 1), sw, sh, 2)
  if (coverage(m) > 0.6) return
  into.set(upscale(m, sw, sh, w, h))
}

function toUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('Kunde inte visa skissen.'))), 'image/jpeg', 0.9),
  )
}
