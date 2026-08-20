import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import styles from './Auth.module.css'

interface ResetPasswordProps {
  onDone: () => void
}

export function ResetPassword({ onDone }: ResetPasswordProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    onDone()
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>ListiApp</h1>
        <p className={styles.subtitle}>Elige tu nueva contraseña</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? 'Un momento…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
