import { useState, type FormEvent } from 'react'
import type { NewShiftType, Store } from '../data/store'
import type { Pattern, ShiftType } from '../types'
import { todayISO } from '../lib/dates'
import { fmtShort, patternLabel, shiftHours } from '../lib/format'

interface Props {
  store: Store
  shiftTypes: ShiftType[]
  patterns: Pattern[]
  account: string
  signOutLabel?: string
  onSignOut: () => void
  onChanged: () => void
  onError: (e: unknown) => void
  onBack: () => void
}

const PRESETS: [number, number][] = [
  [12, 60],
  [12, 36],
  [24, 48],
  [24, 72],
]

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#16a34a', '#0891b2', '#475569']

export function Settings(props: Props) {
  const { store, shiftTypes, patterns, account, signOutLabel, onSignOut, onChanged, onError, onBack } = props
  return (
    <div className="app settings">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar">
          ‹
        </button>
        <h1 className="month-title">Configurações</h1>
      </header>

      <PatternSection store={store} shiftTypes={shiftTypes} patterns={patterns} onChanged={onChanged} onError={onError} />
      <ShiftTypesSection store={store} shiftTypes={shiftTypes} onChanged={onChanged} onError={onError} />

      <section className="card">
        <h2>Conta</h2>
        <p className="muted">{account}</p>
        <button className="btn" onClick={onSignOut}>
          {signOutLabel ?? 'Sair'}
        </button>
      </section>
    </div>
  )
}

function PatternSection({
  store,
  shiftTypes,
  patterns,
  onChanged,
  onError,
}: Pick<Props, 'store' | 'shiftTypes' | 'patterns' | 'onChanged' | 'onError'>) {
  const [on, setOn] = useState(12)
  const [off, setOff] = useState(60)
  const [anchor, setAnchor] = useState(todayISO())
  const [typeId, setTypeId] = useState('')
  const [busy, setBusy] = useState(false)
  const effectiveType = typeId || shiftTypes[0]?.id || ''

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!effectiveType) return
    setBusy(true)
    try {
      await store.savePattern({ shift_type_id: effectiveType, anchor_date: anchor, on_hours: on, off_hours: off })
      onChanged()
    } catch (err) {
      onError(err)
    } finally {
      setBusy(false)
    }
  }

  const typeName = (id: string) => shiftTypes.find((s) => s.id === id)?.name ?? '?'

  return (
    <section className="card">
      <h2>Escala</h2>
      {patterns.length > 0 && (
        <ul className="list">
          {[...patterns].reverse().map((p) => (
            <li key={p.id}>
              <div>
                <strong>{patternLabel(p)}</strong> · {typeName(p.shift_type_id)}
                <div className="muted small">a partir de {fmtShort(p.anchor_date)}</div>
              </div>
              <button
                className="icon-btn danger"
                aria-label="Apagar escala"
                onClick={async () => {
                  if (!confirm(`Apagar a escala ${patternLabel(p)} que começa em ${fmtShort(p.anchor_date)}?`)) return
                  try {
                    await store.deletePattern(p.id)
                    onChanged()
                  } catch (err) {
                    onError(err)
                  }
                }}
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="stack">
        <h3>{patterns.length ? 'Nova escala' : 'Configurar escala'}</h3>
        <div className="presets">
          {PRESETS.map(([a, b]) => (
            <button
              type="button"
              key={`${a}x${b}`}
              className={`chip ${on === a && off === b ? 'on' : ''}`}
              onClick={() => {
                setOn(a)
                setOff(b)
              }}
            >
              {a}x{b}
            </button>
          ))}
        </div>
        <div className="row">
          <label className="field">
            <span>Horas trabalhando</span>
            <input type="number" min={1} max={72} value={on} onChange={(e) => setOn(Number(e.target.value))} required />
          </label>
          <label className="field">
            <span>Horas de folga</span>
            <input type="number" min={1} max={336} value={off} onChange={(e) => setOff(Number(e.target.value))} required />
          </label>
        </div>
        <label className="field">
          <span>Data de um plantão seu (início da escala)</span>
          <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} required />
        </label>
        <label className="field">
          <span>Turno</span>
          <select value={effectiveType} onChange={(e) => setTypeId(e.target.value)} required>
            {shiftTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({shiftHours(s)})
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">
          A escala vale a partir dessa data. Se um dia sua escala mudar, crie uma nova com a nova data: o passado e os dias
          que você editou à mão continuam como estão.
        </p>
        <button className="btn primary" disabled={busy || !effectiveType}>
          Salvar escala
        </button>
      </form>
    </section>
  )
}

const EMPTY: NewShiftType = { name: '', code: '', color: COLORS[0], start_time: '08:00', end_time: '20:00' }

function ShiftTypesSection({
  store,
  shiftTypes,
  onChanged,
  onError,
}: Pick<Props, 'store' | 'shiftTypes' | 'onChanged' | 'onError'>) {
  const [editing, setEditing] = useState<NewShiftType | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    try {
      await store.saveShiftType({ ...editing, name: editing.name.trim(), code: editing.code.trim().toUpperCase() })
      setEditing(null)
      onChanged()
    } catch (err) {
      onError(err)
    }
  }

  return (
    <section className="card">
      <h2>Tipos de turno</h2>
      <ul className="list">
        {shiftTypes.map((s) => (
          <li key={s.id}>
            <span className="code" style={{ '--shift': s.color } as React.CSSProperties}>
              {s.code}
            </span>
            <div className="grow">
              <strong>{s.name}</strong>
              <div className="muted small">{shiftHours(s)}</div>
            </div>
            <button className="btn small" onClick={() => setEditing(s)}>
              Editar
            </button>
          </li>
        ))}
      </ul>

      {editing ? (
        <form onSubmit={submit} className="stack">
          <div className="row">
            <label className="field grow">
              <span>Nome</span>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
                maxLength={40}
              />
            </label>
            <label className="field narrow">
              <span>Sigla</span>
              <input
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                required
                maxLength={3}
              />
            </label>
          </div>
          <div className="row">
            <label className="field">
              <span>Início</span>
              <input
                type="time"
                value={editing.start_time}
                onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Fim</span>
              <input
                type="time"
                value={editing.end_time}
                onChange={(e) => setEditing({ ...editing, end_time: e.target.value })}
                required
              />
            </label>
          </div>
          <div className="colors">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`color ${editing.color === c ? 'on' : ''}`}
                style={{ background: c }}
                aria-label={`Cor ${c}`}
                onClick={() => setEditing({ ...editing, color: c })}
              />
            ))}
          </div>
          <div className="row">
            {editing.id && (
              <button
                type="button"
                className="btn danger"
                onClick={async () => {
                  if (!confirm(`Apagar o tipo "${editing.name}"?`)) return
                  try {
                    await store.deleteShiftType(editing.id!)
                    setEditing(null)
                    onChanged()
                  } catch (err) {
                    onError(err)
                  }
                }}
              >
                Apagar
              </button>
            )}
            <div className="spacer" />
            <button type="button" className="btn" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button className="btn primary">Salvar</button>
          </div>
        </form>
      ) : (
        <button className="btn block" onClick={() => setEditing({ ...EMPTY })}>
          + Novo tipo de turno
        </button>
      )}
    </section>
  )
}
