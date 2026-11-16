import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { describeAuthError } from '../lib/authErrors'
import { showToast } from '../lib/toast'
import { Logo } from './Logo'
import styles from './Auth.module.css'

interface ResetPasswordProps {
  onDone: () => void
}

export function ResetPassword({ onDone }: ResetPasswordProps) {
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    if (password !== repeat) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(describeAuthError(error))
      return
    }
    showToast({ kind: 'success', message: 'Contraseña actualizada' })
    onDone()
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Logo size={72} className={styles.logo} />
        <h1 className={styles.title}>Nueva contraseña</h1>
        <p className={styles.subtitle}>Elige una contraseña para tu cuenta</p>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Nueva contraseña</span>
            <input
              className="input"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field-label">Repite la contraseña</span>
            <input
              className="input"
              type="password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Un momento…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>

      <p className={styles.switch}>
        <button className={styles.linkButton} type="button" onClick={onDone}>
          Ahora no
        </button>
      </p>
    </div>
  )
}
