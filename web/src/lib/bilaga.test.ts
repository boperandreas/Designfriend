import { describe, expect, it } from 'vitest'
import { sha256, unsentImages } from './bilaga'

const t = (m: number) => `2026-09-27T17:${String(m).padStart(2, '0')}:00+00:00`

describe('unsentImages', () => {
  it('returns photos uploaded after the last message and not sent', () => {
    const bilder = [{ id: 'a', skapad: t(1) }, { id: 'b', skapad: t(5) }, { id: 'c', skapad: t(9) }]
    const meddelanden = [{ bilder: ['b'], skapad: t(6) }, { bilder: [], skapad: t(7) }]
    expect(unsentImages(bilder, meddelanden).map((b) => b.id)).toEqual(['c'])
  })

  it('ignores old unsent photos from before the conversation went on', () => {
    const bilder = [{ id: 'gammal', skapad: t(0) }]
    expect(unsentImages(bilder, [{ bilder: [], skapad: t(47) }])).toEqual([])
  })

  it('returns every photo when there are no messages yet', () => {
    const bilder = [{ id: 'y', skapad: t(2) }, { id: 'x', skapad: t(1) }]
    expect(unsentImages(bilder, []).map((b) => b.id)).toEqual(['x', 'y'])
  })
})

describe('sha256', () => {
  it('gives the same hash for the same bytes', async () => {
    const a = new TextEncoder().encode('rum').buffer as ArrayBuffer
    const b = new TextEncoder().encode('rum').buffer as ArrayBuffer
    expect(await sha256(a)).toBe(await sha256(b))
    expect(await sha256(a)).toHaveLength(64)
  })
})
