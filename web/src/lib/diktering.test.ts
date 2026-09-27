import { describe, expect, it } from 'vitest'
import { combine, felText } from './diktering'

const r = (t: string, isFinal = true) => ({ isFinal, 0: { transcript: t } })

describe('combine', () => {
  it('starts a new message with a capital letter', () => {
    expect(combine('', [r('jag vill ha ett lugnare rum')])).toBe('Jag vill ha ett lugnare rum')
  })
  it('appends to what was already typed', () => {
    expect(combine('Soffan stannar.', [r('men mattan kan bytas')])).toBe('Soffan stannar. men mattan kan bytas')
  })
  it('includes interim results and collapses spaces', () => {
    expect(combine('', [r('ljust '), r(' och  varmt', false)])).toBe('Ljust och varmt')
  })
  it('keeps the text when nothing was heard', () => {
    expect(combine('Hej', [])).toBe('Hej')
  })
})

describe('felText', () => {
  it('is silent when the user just did not speak', () => {
    expect(felText('no-speech')).toBeNull()
  })
  it('explains a denied microphone in Swedish', () => {
    expect(felText('not-allowed')).toMatch(/mikrofonen/)
  })
})
