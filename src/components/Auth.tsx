import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import styles from './Auth.module.css'

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
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

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      setLoading(false)
      if (error) {
        setError(error.message)
        return
      }
      setInfoMessage('Te enviamos un email con instrucciones para restablecer tu contraseña.')
      return
    }

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
      setInfoMessage('Cuenta creada. Si tu proyecto pide confirmación de email, revisa tu correo antes de entrar.')
    }
  }

  function switchMode(nextMode: 'login' | 'signup' | 'forgot') {
    setMode(nextMode)
    setError(null)
    setInfoMessage(null)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>ListiApp</h1>
        <p className={styles.subtitle}>
          {mode === 'login' && 'Inicia sesión para ver tus listas'}
          {mode === 'signup' && 'Crea una cuenta'}
          {mode === 'forgot' && 'Recupera el acceso a tu cuenta'}
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
          {mode !== 'forgot' && (
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
          )}

          {error && <p className={styles.error}>{error}</p>}
          {infoMessage && <p className={styles.info}>{infoMessage}</p>}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading
              ? 'Un momento…'
              : mode === 'login'
                ? 'Entrar'
                : mode === 'signup'
                  ? 'Crear cuenta'
                  : 'Enviar email'}
          </button>
        </form>

        {mode === 'login' && (
          <button className={styles.switchButton} type="button" onClick={() => switchMode('forgot')}>
            ¿Olvidaste tu contraseña?
          </button>
        )}

        <button
          className={styles.switchButton}
          type="button"
          onClick={() => switchMode(mode === 'signup' ? 'login' : mode === 'forgot' ? 'login' : 'signup')}
        >
          {mode === 'login' && '¿No tienes cuenta? Crea una'}
          {mode === 'signup' && '¿Ya tienes cuenta? Inicia sesión'}
          {mode === 'forgot' && 'Volver a iniciar sesión'}
        </button>
      </div>
    </div>
  )
}
