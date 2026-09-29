import { describe, expect, it } from 'vitest'
import { blend, coverage, dilate, feather, margins, maskFromRGBA } from './komposit'

const rgba = (px: number[][]) => new Uint8ClampedArray(px.flat())

describe('maskFromRGBA', () => {
  it('marks bright opaque pixels', () => {
    const m = maskFromRGBA(rgba([[255, 255, 255, 255], [0, 0, 0, 255], [255, 255, 255, 0], [200, 200, 200, 255]]))
    expect(Array.from(m)).toEqual([255, 0, 0, 255])
    expect(coverage(m)).toBe(0.5)
  })
})

describe('dilate', () => {
  it('grows a single pixel into a square', () => {
    const w = 5, h = 5
    const m = new Uint8Array(w * h); m[12] = 255
    const d = dilate(m, w, h, 1)
    const set = Array.from(d).map((v, i) => (v ? i : -1)).filter((i) => i >= 0)
    expect(set).toEqual([6, 7, 8, 11, 12, 13, 16, 17, 18])
  })
})

describe('feather', () => {
  it('keeps the inside solid and fades the edge', () => {
    const w = 9, h = 1
    const m = new Uint8Array([0, 0, 255, 255, 255, 255, 255, 0, 0])
    const f = feather(m, w, h, 1)
    expect(f[4]).toBe(255)
    expect(f[1]).toBeGreaterThan(0)
    expect(f[1]).toBeLessThan(255)
  })
})

describe('blend', () => {
  it('keeps the original outside the mask exactly', () => {
    const o = rgba([[10, 20, 30, 255], [40, 50, 60, 255]])
    const g = rgba([[200, 200, 200, 255], [0, 0, 0, 255]])
    const out = blend(o, g, new Uint8Array([0, 255]))
    expect(Array.from(out)).toEqual([10, 20, 30, 255, 0, 0, 0, 255])
  })
})

describe('margins', () => {
  it('scales with the photo', () => {
    expect(margins(2000, 1500)).toEqual({ grow: 30, soft: 15 })
  })
})

describe('diff fallback', () => {
  it('finds a changed block and ignores a mild shift', async () => {
    const { diffMask, erode, upscale } = await import('./komposit')
    const w = 6, h = 6
    const a = new Uint8ClampedArray(w * h * 4).fill(100)
    const b = new Uint8ClampedArray(w * h * 4).fill(110) // mild shift everywhere
    for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) { const j = (y * w + x) * 4; b[j] = b[j + 1] = b[j + 2] = 220 }
    b[0] = 250 // a single speck
    const m = diffMask(a, b)
    expect(m[3 * w + 3]).toBe(255)
    expect(m[1]).toBe(0)
    expect(m[0]).toBe(255)
    const clean = erode(m, w, h, 1)
    expect(clean[0]).toBe(0)
    expect(clean[3 * w + 3]).toBe(255)
    expect(Array.from(upscale(new Uint8Array([0, 255]), 2, 1, 4, 1))).toEqual([0, 0, 255, 255])
  })
})

describe('fillBoxes', () => {
  it('marks a box given in percent', async () => {
    const { fillBoxes } = await import('./komposit')
    const w = 10, h = 10
    const m = new Uint8Array(w * h)
    fillBoxes(m, w, h, [{ x: 20, y: 50, bredd: 30, hojd: 20 }])
    expect(m[5 * w + 2]).toBe(255)
    expect(m[6 * w + 4]).toBe(255)
    expect(m[5 * w + 5]).toBe(0)
    expect(m[7 * w + 2]).toBe(0)
    expect(m.filter(Boolean).length).toBe(6)
  })
})
