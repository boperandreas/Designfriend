/**
 * Minimal, safe formatting for the advisor's replies: paragraphs, bullet and
 * numbered lists, and **bold**. Produces plain data that React renders as
 * elements, never HTML strings.
 */
export type Inline = { text: string; bold: boolean }
export type Blok =
  | { kind: 'p'; lines: Inline[][] }
  | { kind: 'ul' | 'ol'; items: Inline[][] }

export function parseInline(line: string): Inline[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((p) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4
      ? { text: p.slice(2, -2), bold: true }
      : { text: p, bold: false },
  )
}

export function parseText(src: string): Blok[] {
  const blocks: Blok[] = []
  for (const chunk of src.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = chunk.split('\n').filter((l) => l.trim() !== '')
    let para: Inline[][] = []
    let list: { kind: 'ul' | 'ol'; items: Inline[][] } | null = null
    const flushPara = () => { if (para.length) { blocks.push({ kind: 'p', lines: para }); para = [] } }
    const flushList = () => { if (list) { blocks.push(list); list = null } }
    for (const raw of lines) {
      const line = raw.trim()
      const ul = line.match(/^[-*•]\s+(.*)$/)
      const ol = line.match(/^\d+[.)]\s+(.*)$/)
      const kind = ul ? 'ul' : ol ? 'ol' : null
      if (kind) {
        flushPara()
        if (!list || list.kind !== kind) { flushList(); list = { kind, items: [] } }
        list.items.push(parseInline((ul ?? ol)![1]))
      } else {
        flushList()
        para.push(parseInline(line.replace(/^#+\s*/, '')))
      }
    }
    flushPara()
    flushList()
  }
  return blocks
}
