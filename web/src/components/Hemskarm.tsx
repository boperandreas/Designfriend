import { useState } from 'react'

const KEY = 'df-hemskarm-dold'

function visas(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  let dold = false
  try { dold = localStorage.getItem(KEY) === '1' } catch { /* private mode */ }
  return ios && !standalone && !dold
}

/** iPhone never suggests adding a web app to the home screen, so we explain it once. */
export function Hemskarm() {
  const [open, setOpen] = useState(visas)
  if (!open) return null
  return (
    <div className="hemskarm" role="note">
      <p>
        <strong>Lägg Designfriend på hemskärmen.</strong> Tryck på dela-knappen i Safari och välj{' '}
        <em>Lägg till på hemskärmen</em>. Sedan öppnar du den som en app.
      </p>
      <button
        className="link"
        onClick={() => { try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } setOpen(false) }}
      >
        Okej
      </button>
    </div>
  )
}
