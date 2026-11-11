import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { createLocalStore, createSupabaseStore } from './data/store'
import { Login } from './components/Login'
import { Setup } from './components/Setup'
import { CalendarApp } from './components/CalendarApp'

const DEMO_KEY = 'mycalendar-demo-mode'

function readDemo() {
  try {
    return localStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

function writeDemo(on: boolean) {
  try {
    if (on) localStorage.setItem(DEMO_KEY, '1')
    else localStorage.removeItem(DEMO_KEY)
  } catch {
    /* ignora */
  }
}

// Só em desenvolvimento: http://localhost:5173/?demo abre o modo demonstração mesmo com Supabase configurado.
const forceDemo = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')

export default function App() {
  return supabase && !forceDemo ? <WithAuth /> : <DemoGate />
}

function WithAuth() {
  const sb = supabase!
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [sb])

  const userId = session?.user.id
  const store = useMemo(() => (userId ? createSupabaseStore(sb, userId) : null), [sb, userId])

  if (session === undefined) return <div className="splash">Carregando…</div>
  if (!session || !store) return <Login />

  const name = (session.user.user_metadata?.display_name as string | undefined) || session.user.email || ''
  return <CalendarApp key={session.user.id} store={store} account={name} onSignOut={() => sb.auth.signOut()} />
}

function DemoGate() {
  const [demo, setDemo] = useState(readDemo)
  const store = useMemo(() => (demo ? createLocalStore() : null), [demo])

  if (!store) {
    return (
      <Setup
        onDemo={() => {
          writeDemo(true)
          setDemo(true)
        }}
      />
    )
  }
  return (
    <CalendarApp
      store={store}
      account="Modo demonstração (dados só neste aparelho)"
      signOutLabel="Sair da demonstração"
      onSignOut={() => {
        writeDemo(false)
        setDemo(false)
      }}
    />
  )
}
