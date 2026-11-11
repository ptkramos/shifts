export function Setup({ onDemo }: { onDemo: () => void }) {
  return (
    <main className="auth">
      <div className="auth-card">
        <img className="auth-logo" src="/icon.svg" alt="" />
        <div className="auth-head">
          <h1>Shifts</h1>
          <p className="lead">O app ainda não está conectado ao banco de dados.</p>
        </div>
        <div className="card">
          <ol className="steps">
            <li>
              Rode o SQL de <code>supabase/migrations</code> no Supabase.
            </li>
            <li>
              Copie <code>.env.example</code> para <code>.env.local</code> e preencha a URL e a chave <em>anon</em>.
            </li>
            <li>Reinicie o servidor de desenvolvimento.</li>
          </ol>
        </div>
        <div className="press-room">
          <button className="btn primary block" onClick={onDemo}>
            Experimentar
          </button>
        </div>
        <p className="hint center">No modo demonstração os dados ficam só neste navegador.</p>
      </div>
    </main>
  )
}
