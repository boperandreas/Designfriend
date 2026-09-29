import { parseText, type Inline } from '../lib/text'
import { findNcs, hex, ncsToRgb } from '../lib/ncs'

function Rad({ parts }: { parts: Inline[] }) {
  return <>{parts.map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}</>
}

/** Renders a reply with paragraphs, lists and bold, without any HTML injection. */
export function Svar({ text }: { text: string }) {
  const koder = findNcs(text)
  return (
    <>
      {parseText(text).map((b, i) => {
        if (b.kind === 'p') {
          return <p key={i}>{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}<Rad parts={l} /></span>)}</p>
        }
        const List = b.kind
        return <List key={i}>{b.items.map((it, j) => <li key={j}><Rad parts={it} /></li>)}</List>
      })}
      {koder.length > 0 && (
        <div className="palett" aria-label="Kulörer, ungefär som på skärm">
          {koder.map((k) => (
            <figure key={k} className="kulor">
              <i style={{ background: hex(ncsToRgb(k)!) }} />
              <figcaption>{k}</figcaption>
            </figure>
          ))}
          <p className="muted small" style={{ width: '100%' }}>Ungefär på skärm. Jämför alltid med ett riktigt kulörprov.</p>
        </div>
      )}
    </>
  )
}
