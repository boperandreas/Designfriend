import { supabase } from './supabase'
import { blend, coverage, diffMask, dilate, erode, feather, margins, maskFromRGBA, upscale } from './komposit'

export interface Skiss {
  id: string
  kalla_bild_id: string | null
  beskrivning: string
  status: 'ny' | 'pagar' | 'klar' | 'fel'
  sokvag: string | null
  masker: string[]
  fel: string | null
  skapad: string
}

export const SKISS_FALT = 'id,kalla_bild_id,beskrivning,status,sokvag,masker,fel,skapad'

/** Remove the note the server adds to a reply when it orders a sketch. */
export function utanSkissNotis(text: string): string {
  return text.replace(/\s*\[Skiss beställd: [^\]]*\]\s*$/, '').trim()
}

async function bitmaps(paths: string[]): Promise<ImageBitmap[]> {
  const { data, error } = await supabase.storage.from('bilder').createSignedUrls(paths, 600)
  if (error || !data) throw new Error('Kunde inte hämta skissen.')
  return Promise.all(data.map(async (d) => {
    if (!d.signedUrl) throw new Error('Kunde inte hämta skissen.')
    const res = await fetch(d.signedUrl)
    if (!res.ok) throw new Error('Kunde inte hämta skissen.')
    return createImageBitmap(await res.blob())
  }))
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
export async function composeSketch(s: Skiss, originalPath: string): Promise<{ efter: string; fore: string }> {
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
    for (let i = 0; i < one.length; i++) if (one[i]) union[i] = 255
  }
  if (coverage(union) === 0) diffFallback(original, generated, w, h, union)
  const gen = pixels(ctx, generated, w, h)
  if (coverage(union) > 0) {
    const { grow, soft } = margins(w, h)
    const alpha = feather(dilate(union, w, h, grow), w, h, soft)
    ctx.putImageData(new ImageData(blend(orig, gen, alpha), w, h), 0, 0)
  }
  // If the whole room changed (a new style for everything) it is shown as it is.
  for (const b of [original, generated, ...masks]) b.close()
  return { efter: await toUrl(canvas), fore }
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
