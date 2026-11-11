export function Setup({ onDemo }: { onDemo: () => void }) {
  return (
    <main className="auth">
      <div className="auth-card">
        <h1>MyCalendar</h1>
        <p className="muted">O app ainda não está conectado ao banco de dados.</p>
        <ol className="steps">
          <li>
            Rode o SQL de <code>supabase/migrations/20261110000000_init.sql</code> no SQL Editor do Supabase.
          </li>
          <li>
            Copie <code>.env.example</code> para <code>.env.local</code> e preencha a URL e a chave <em>anon</em>.
          </li>
          <li>Reinicie o servidor de desenvolvimento.</li>
        </ol>
        <button className="btn primary block" onClick={onDemo}>
          Experimentar em modo demonstração
        </button>
        <p className="muted small">No modo demonstração os dados ficam só neste navegador.</p>
      </div>
    </main>
  )
}
