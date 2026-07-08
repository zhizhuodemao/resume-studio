import { useState } from 'react'
import { login, register } from '../api.js'

export default function AccountModal({ t, onClose, onAuthed }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const user = mode === 'login' ? await login(email, password) : await register(email, password)
      onAuthed(user)
    } catch (err) {
      setError(t.account.errors[err.code] || t.account.errors.network)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="onboard-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="onboard-card account-card" onClick={e => e.stopPropagation()}>
        <h2>{mode === 'login' ? t.account.login : t.account.register}</h2>
        <p className="onboard-sub">{t.account.subtitle}</p>
        <form onSubmit={submit}>
          <label className="field">
            <span>{t.account.email}</span>
            <input
              type="email"
              required
              value={email}
              autoComplete="email"
              onChange={e => setEmail(e.target.value)}
              data-testid="account-email"
            />
          </label>
          <label className="field">
            <span>{t.account.password}</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={e => setPassword(e.target.value)}
              data-testid="account-password"
            />
          </label>
          {error && <div className="account-error">{error}</div>}
          <div className="onboard-actions">
            <button className="btn btn-primary" type="submit" disabled={busy} data-testid="account-submit">
              {busy ? '…' : mode === 'login' ? t.account.submitLogin : t.account.submitRegister}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setMode(m => (m === 'login' ? 'register' : 'login'))
                setError('')
              }}
              data-testid="account-switch"
            >
              {mode === 'login' ? t.account.switchToRegister : t.account.switchToLogin}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
