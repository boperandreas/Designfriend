import { describe, expect, it } from 'vitest'
import { findNcs, hex, ncsToRgb } from './ncs'

describe('findNcs', () => {
  it('finds and normalises codes', () => {
    expect(findNcs('Prova S 1515-Y20R eller NCS S 2005-G80Y, inte S1515-Y20R igen. S 0500-N till taket.'))
      .toEqual(['S 1515-Y20R', 'S 2005-G80Y', 'S 0500-N'])
  })
  it('ignores things that are not codes', () => {
    expect(findNcs('2700 K, 1515 mm, S 9090-Y')).toEqual([])
    expect(findNcs('S 1020-Y20B')).toEqual([])
  })
})

describe('ncsToRgb', () => {
  it('gives greys for N', () => {
    expect(hex(ncsToRgb('S 0500-N')!)).toBe('#F2F2F2')
    expect(ncsToRgb('S 9000-N')!.r).toBeLessThan(30)
  })
  it('gives plausible hues', () => {
    const gul = ncsToRgb('S 1070-Y')!
    expect(gul.r).toBeGreaterThan(200); expect(gul.b).toBeLessThan(80)
    const rod = ncsToRgb('S 1080-R')!
    expect(rod.r).toBeGreaterThan(150); expect(rod.g).toBeLessThan(60)
    const bla = ncsToRgb('S 2060-B')!
    expect(bla.b).toBeGreaterThan(bla.r)
    const gron = ncsToRgb('S 3050-G')!
    expect(gron.g).toBeGreaterThan(gron.r)
    const beige = ncsToRgb('S 1515-Y20R')!
    expect(beige.r).toBeGreaterThan(beige.b)
  })
})
