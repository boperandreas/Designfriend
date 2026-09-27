import { parseText, type Inline } from '../lib/text'

function Rad({ parts }: { parts: Inline[] }) {
  return <>{parts.map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>))}</>
}

/** Renders a reply with paragraphs, lists and bold, without any HTML injection. */
export function Svar({ text }: { text: string }) {
  return (
    <>
      {parseText(text).map((b, i) => {
        if (b.kind === 'p') {
          return <p key={i}>{b.lines.map((l, j) => <span key={j}>{j > 0 && <br />}<Rad parts={l} /></span>)}</p>
        }
        const List = b.kind
        return <List key={i}>{b.items.map((it, j) => <li key={j}><Rad parts={it} /></li>)}</List>
      })}
    </>
  )
}
