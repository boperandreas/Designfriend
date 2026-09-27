import { describe, expect, it } from 'vitest'
import { parseText } from './text'
import { targetSize } from './storlek'

describe('parseText', () => {
  it('splits paragraphs and lists and keeps bold as data', () => {
    const blocks = parseText('Hej **du**.\n\n- ett\n- två\n\n1. först')
    expect(blocks).toEqual([
      { kind: 'p', lines: [[{ text: 'Hej ', bold: false }, { text: 'du', bold: true }, { text: '.', bold: false }]] },
      { kind: 'ul', items: [[{ text: 'ett', bold: false }], [{ text: 'två', bold: false }]] },
      { kind: 'ol', items: [[{ text: 'först', bold: false }]] },
    ])
  })

  it('never turns markup into HTML', () => {
    const blocks = parseText('<img src=x onerror=alert(1)>')
    expect(blocks).toEqual([{ kind: 'p', lines: [[{ text: '<img src=x onerror=alert(1)>', bold: false }]] }])
  })
})

describe('targetSize', () => {
  it('caps the longest side at 2000 px and keeps the ratio', () => {
    expect(targetSize(4032, 3024)).toEqual({ width: 2000, height: 1500 })
    expect(targetSize(3024, 4032)).toEqual({ width: 1500, height: 2000 })
  })
  it('never upscales', () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
})
