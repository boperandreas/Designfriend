import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [losenord, setLosenord] = useState('')
  const [busy, setBusy] = useState(false)
  const [fel, setFel] = useState<string | null>(null)

  async function loggaIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFel(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: losenord })
    setBusy(false)
    if (error) {
      setFel(/invalid|credentials/i.test(error.message)
        ? 'E-postadressen eller lösenordet stämmer inte.'
        : 'Det gick inte att logga in just nu. Försök igen om en stund.')
    }
  }

  return (
    <main className="login">
      <img src="/icon-192.png" alt="" width={72} height={72} className="login-icon" />
      <h1>Designfriend</h1>
      <p className="muted">En kunnig vän som hjälper dig med ditt hem.</p>

      <form onSubmit={loggaIn} className="login-form">
        <label htmlFor="email">E-postadress</label>
        <input
          id="email" type="email" autoComplete="username" inputMode="email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="losenord">Lösenord</label>
        <input
          id="losenord" type="password" autoComplete="current-password" required
          value={losenord} onChange={(e) => setLosenord(e.target.value)}
        />
        <button type="submit" className="primary" disabled={busy || !email || !losenord}>
          {busy ? 'Loggar in…' : 'Logga in'}
        </button>
      </form>
      {fel && <p className="fel" role="alert">{fel}</p>}
    </main>
  )
}
