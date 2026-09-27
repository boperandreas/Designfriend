import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [kod, setKod] = useState('')
  const [steg, setSteg] = useState<'email' | 'kod'>('email')
  const [busy, setBusy] = useState(false)
  const [fel, setFel] = useState<string | null>(null)

  async function skickaKod(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFel(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setBusy(false)
    if (error) {
      setFel(/signup|not allowed|not found/i.test(error.message)
        ? 'Den här adressen är inte inbjuden. Kontrollera stavningen.'
        : 'Koden kunde inte skickas. Vänta en minut och försök igen.')
      return
    }
    setSteg('kod')
  }

  async function loggaIn(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setFel(null)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: kod.trim(), type: 'email' })
    setBusy(false)
    if (error) setFel('Koden stämmer inte eller har gått ut. Be om en ny kod.')
  }

  return (
    <main className="login">
      <img src="/icon-192.png" alt="" width={72} height={72} className="login-icon" />
      <h1>Designfriend</h1>
      <p className="muted">En kunnig vän som hjälper dig med ditt hem.</p>

      {steg === 'email' ? (
        <form onSubmit={skickaKod} className="login-form">
          <label htmlFor="email">E-postadress</label>
          <input
            id="email" type="email" autoComplete="email" inputMode="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="primary" disabled={busy || !email}>
            {busy ? 'Skickar…' : 'Skicka kod'}
          </button>
        </form>
      ) : (
        <form onSubmit={loggaIn} className="login-form">
          <label htmlFor="kod">Koden i mejlet till {email}</label>
          <input
            id="kod" inputMode="numeric" autoComplete="one-time-code" required
            pattern="[0-9]*" maxLength={10} value={kod} onChange={(e) => setKod(e.target.value)}
          />
          <button type="submit" className="primary" disabled={busy || kod.length < 6}>
            {busy ? 'Loggar in…' : 'Logga in'}
          </button>
          <button type="button" className="link" onClick={() => { setSteg('email'); setKod('') }}>
            Annan adress eller ny kod
          </button>
        </form>
      )}
      {fel && <p className="fel" role="alert">{fel}</p>}
    </main>
  )
}
