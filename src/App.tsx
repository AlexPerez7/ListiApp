import { lazy, Suspense, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'
import { setOutboxUser } from './lib/outbox'
import { ConfirmHost } from './components/Overlays'
import { Logo } from './components/Logo'
import { ScreenLoading } from './components/ScreenLoading'
import styles from './App.module.css'

const Workspace = lazy(() => import('./Workspace'))
const Auth = lazy(() => import('./components/Auth').then((module) => ({ default: module.Auth })))
const ResetPassword = lazy(() => import('./components/ResetPassword').then((module) => ({ default: module.ResetPassword })))

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    // La cola de cambios pendientes se activa antes de mostrar los datos del
    // usuario, para que ninguna lectura pise cambios aún sin enviar.
    const applySession = (next: Session | null) => {
      setOutboxUser(next?.user.id ?? null)
      setSession(next)
    }

    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session)
      setSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      applySession(next)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return <SetupNotice />

  if (sessionLoading) {
    return (
      <div className={styles.splash}>
        <Logo size={72} className={styles.splashLogo} />
      </div>
    )
  }

  if (passwordRecovery) {
    return <Suspense fallback={<ScreenLoading />}><ResetPassword onDone={() => setPasswordRecovery(false)} /></Suspense>
  }

  if (!session) {
    return <Suspense fallback={<ScreenLoading />}><Auth /></Suspense>
  }

  return (
    <>
      <Suspense fallback={<ScreenLoading />}><Workspace key={session.user.id} user={session.user} /></Suspense>
      <ConfirmHost />
    </>
  )
}

function SetupNotice() {
  return (
    <div className={styles.setup}>
      <Logo size={56} />
      <h1>Falta configurar Supabase</h1>
      <p>
        Copia <strong>.env.example</strong> a <strong>.env</strong> y completa la URL y la clave pública de tu proyecto
        (Project Settings → API). Luego reinicia el servidor de desarrollo.
      </p>
      <code>{'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY='}</code>
    </div>
  )
}

export default App
