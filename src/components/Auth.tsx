import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import styles from './Auth.module.css'

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfoMessage(null)
    setLoading(true)

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (mode === 'signup') {
      setInfoMessage('Cuenta creada. Si tu proyecto pide confirmación de email, revisá tu correo antes de entrar.')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>ListiApp</h1>
        <p className={styles.subtitle}>
          {mode === 'login' ? 'Iniciá sesión para ver tus listas' : 'Creá una cuenta'}
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />

          {error && <p className={styles.error}>{error}</p>}
          {infoMessage && <p className={styles.info}>{infoMessage}</p>}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          className={styles.switchButton}
          type="button"
          onClick={() => {
            setMode((prev) => (prev === 'login' ? 'signup' : 'login'))
            setError(null)
            setInfoMessage(null)
          }}
        >
          {mode === 'login' ? '¿No tenés cuenta? Creá una' : '¿Ya tenés cuenta? Iniciá sesión'}
        </button>
      </div>
    </div>
  )
}
