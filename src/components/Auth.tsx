import { useState, type FormEvent } from 'react'
import { authRedirectUrl, supabase } from '../lib/supabaseClient'
import { describeAuthError } from '../lib/authErrors'
import { Icon } from './Icon'
import { Logo } from './Logo'
import styles from './Auth.module.css'

type Mode = 'login' | 'signup' | 'forgot'

const SUBTITLES: Record<Mode, string> = {
  login: 'Inicia sesión para ver tus listas',
  signup: 'Crea tu cuenta en segundos',
  forgot: 'Te enviaremos un enlace para restablecer tu contraseña',
}

const SUBMIT_LABELS: Record<Mode, string> = {
  login: 'Entrar',
  signup: 'Crear cuenta',
  forgot: 'Enviar enlace',
}

export function Auth() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setInfoMessage(null)
    setLoading(true)

    const address = email.trim()
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(address, {
          redirectTo: authRedirectUrl,
        })
        if (error) setError(describeAuthError(error))
        else setInfoMessage('Si el correo tiene una cuenta, recibirás un enlace para restablecer tu contraseña.')
        return
      }

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password })
        if (error) setError(describeAuthError(error))
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: address,
        password,
        options: { emailRedirectTo: authRedirectUrl },
      })
      if (error) setError(describeAuthError(error))
      else if (!data.session) {
        setInfoMessage('¡Cuenta creada! Revisa tu correo y abre el enlace de confirmación para entrar.')
      }
    } catch {
      setError('No se pudo conectar. Revisa tu conexión a internet e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode)
    setError(null)
    setInfoMessage(null)
  }

  async function handleGoogleSignIn() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl },
    })
    if (error) setError(describeAuthError(error))
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <Logo size={72} className={styles.logo} />
        <h1 className={styles.title}>ListiApp</h1>
        <p className={styles.subtitle}>{SUBTITLES[mode]}</p>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">Correo electrónico</span>
            <input
              className="input"
              type="email"
              inputMode="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              required
            />
          </label>

          {mode !== 'forgot' && (
            <label className="field">
              <span className="field-label">Contraseña</span>
              <span className={styles.passwordWrap}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className={`icon-btn ${styles.passwordToggle}`}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={19} />
                </button>
              </span>
            </label>
          )}

          {mode === 'login' && (
            <button className={styles.linkButton} type="button" onClick={() => switchMode('forgot')}>
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {infoMessage && (
            <p className={styles.info} role="status">
              {infoMessage}
            </p>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Un momento…' : SUBMIT_LABELS[mode]}
          </button>
        </form>

        {mode !== 'forgot' && (
          <>
            <div className={styles.divider}>
              <span>o</span>
            </div>
            <button className={`btn btn-block ${styles.googleButton}`} type="button" onClick={handleGoogleSignIn}>
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
      </div>

      <p className={styles.switch}>
        {mode === 'login' ? '¿No tienes cuenta?' : mode === 'signup' ? '¿Ya tienes cuenta?' : '¿Recordaste tu contraseña?'}{' '}
        <button className={styles.linkButton} type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Crea una' : 'Inicia sesión'}
        </button>
      </p>
    </div>
  )
}
