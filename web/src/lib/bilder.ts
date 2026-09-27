import { supabase, type Bild } from './supabase'
import { targetSize } from './storlek'


/**
 * Downscale a photo in the browser and re-encode it as JPEG. Re-encoding via a
 * canvas drops all metadata, including EXIF location, so the home address in a
 * photo's GPS tag never leaves the phone.
 */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = targetSize(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Kunde inte behandla bilden.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Kunde inte behandla bilden.'))), 'image/jpeg', 0.86),
  )
}

export async function uploadImage(file: File, projektId: string, typ: Bild['typ']): Promise<Bild> {
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Du behöver logga in igen.')
  const blob = await prepareImage(file)
  const sokvag = `${uid}/${projektId}/${crypto.randomUUID()}.jpg`
  const up = await supabase.storage.from('bilder').upload(sokvag, blob, { contentType: 'image/jpeg' })
  if (up.error) throw new Error('Bilden kunde inte laddas upp. Försök igen.')
  const { data, error } = await supabase
    .from('bild')
    .insert({ projekt_id: projektId, typ, sokvag })
    .select('id,typ,sokvag')
    .single()
  if (error || !data) throw new Error('Bilden kunde inte sparas. Försök igen.')
  return data as Bild
}

export async function signedUrls(bilder: Bild[]): Promise<Record<string, string>> {
  if (!bilder.length) return {}
  const { data } = await supabase.storage.from('bilder').createSignedUrls(bilder.map((b) => b.sokvag), 3600)
  const out: Record<string, string> = {}
  bilder.forEach((b, i) => {
    const url = data?.[i]?.signedUrl
    if (url) out[b.id] = url
  })
  return out
}
