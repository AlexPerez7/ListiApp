import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Logo } from './Logo'
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

  async function handleGoogleSignIn() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Logo size={56} className={styles.logo} />
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

        {mode !== 'forgot' && (
          <>
            <div className={styles.divider}>
              <span>o</span>
            </div>
            <button className={styles.googleButton} type="button" onClick={handleGoogleSignIn}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.61Z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18Z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.95 10.69A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.69V4.98H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.02l2.97-2.33Z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.98l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
                />
              </svg>
              Continuar con Google
            </button>
          </>
        )}

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
