import { useState, type FormEvent } from 'react'
import { ChevronLeft, LogOut, Monitor, Moon, Pencil, Plus, Sun, Trash2 } from 'lucide-react'
import type { NewShiftType, Store } from '../data/store'
import type { Pattern, ShiftType } from '../types'
import { todayISO } from '../lib/dates'
import { fmtShort, patternLabel, shiftHours } from '../lib/format'
import { getTheme, setTheme, type Theme } from '../lib/theme'

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

const shiftStyle = (color: string) => ({ '--shift': color }) as React.CSSProperties

export function Settings(props: Props) {
  const { store, shiftTypes, patterns, account, signOutLabel, onSignOut, onChanged, onError, onBack } = props
  return (
    <div className="app">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={3} />
        </button>
        <h1 className="title">
          <small>Shifts</small>
          <span className="ellipsis">Configurações</span>
        </h1>
      </header>

      <main className="content">
        <PatternSection store={store} shiftTypes={shiftTypes} patterns={patterns} onChanged={onChanged} onError={onError} />
        <ShiftTypesSection store={store} shiftTypes={shiftTypes} onChanged={onChanged} onError={onError} />
        <ThemeSection />
        <section className="card stack">
          <div>
            <h2>Conta</h2>
            <p className="hint">{account}</p>
          </div>
          <div className="press-room">
            <button className="btn block" onClick={onSignOut}>
              <LogOut size={20} strokeWidth={2.5} /> {signOutLabel ?? 'Sair'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

function ThemeSection() {
  const [theme, setLocal] = useState<Theme>(getTheme)
  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'auto', label: 'Auto', icon: <Monitor size={18} strokeWidth={2.5} /> },
    { value: 'light', label: 'Claro', icon: <Sun size={18} strokeWidth={2.5} /> },
    { value: 'dark', label: 'Escuro', icon: <Moon size={18} strokeWidth={2.5} /> },
  ]
  return (
    <section className="card stack">
      <div>
        <h2>Aparência</h2>
        <p className="hint">"Auto" segue o tema do seu celular.</p>
      </div>
      <div className="press-room">
        <div className="segmented" role="radiogroup" aria-label="Tema">
          {options.map((o) => (
            <button
              key={o.value}
              role="radio"
              aria-checked={theme === o.value}
              className={theme === o.value ? 'on' : ''}
              onClick={() => {
                setTheme(o.value)
                setLocal(o.value)
              }}
            >
              {o.icon} {o.label}
            </button>
          ))}
        </div>
      </div>
    </section>
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
  const typesById = new Map(shiftTypes.map((s) => [s.id, s]))

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

  return (
    <section className="card stack">
      <div>
        <h2>Escala</h2>
        <p className="hint">
          Vale a partir da data escolhida. Se sua escala mudar, crie uma nova: o passado e os dias editados à mão
          continuam como estão.
        </p>
      </div>

      {patterns.length > 0 && (
        <ul className="list">
          {[...patterns].reverse().map((p) => {
            const st = typesById.get(p.shift_type_id)
            return (
              <li key={p.id}>
                <span className="badge" style={shiftStyle(st?.color ?? '#888')}>
                  {st?.code}
                </span>
                <div className="grow">
                  <strong className="ellipsis tnum">
                    {patternLabel(p)} · {st?.name ?? '?'}
                  </strong>
                  <div className="muted small tnum">A partir de {fmtShort(p.anchor_date)}</div>
                </div>
                <button
                  className="icon-btn flat danger"
                  aria-label={`Apagar escala ${patternLabel(p)}`}
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
                  <Trash2 size={20} strokeWidth={2.5} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={submit} className="form">
        <h3 className="section-title">{patterns.length ? 'Nova escala' : 'Configurar escala'}</h3>
        <div className="presets" role="radiogroup" aria-label="Escalas comuns">
          {PRESETS.map(([a, b]) => (
            <button
              type="button"
              key={`${a}x${b}`}
              role="radio"
              aria-checked={on === a && off === b}
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
        <div className="row-2">
          <label className="field">
            <span>Horas trabalhando</span>
            <input type="number" inputMode="numeric" min={1} max={72} value={on} onChange={(e) => setOn(Number(e.target.value))} required />
          </label>
          <label className="field">
            <span>Horas de folga</span>
            <input type="number" inputMode="numeric" min={1} max={336} value={off} onChange={(e) => setOff(Number(e.target.value))} required />
          </label>
        </div>
        <label className="field">
          <span>Data de um plantão seu</span>
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
        <div className="press-room">
          <button className="btn primary block" disabled={busy || !effectiveType}>
            Salvar escala
          </button>
        </div>
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
    <section className="card stack">
      <div>
        <h2>Tipos de turno</h2>
        <p className="hint">A sigla aparece no calendário. Use até 3 letras.</p>
      </div>

      <ul className="list">
        {shiftTypes.map((s) => (
          <li key={s.id}>
            <span className="badge" style={shiftStyle(s.color)}>
              {s.code}
            </span>
            <div className="grow">
              <strong className="ellipsis">{s.name}</strong>
              <div className="muted small tnum">{shiftHours(s)}</div>
            </div>
            <button className="icon-btn flat" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`}>
              <Pencil size={20} strokeWidth={2.5} />
            </button>
          </li>
        ))}
      </ul>

      {editing ? (
        <form onSubmit={submit} className="form">
          <h3 className="section-title">{editing.id ? 'Editar turno' : 'Novo turno'}</h3>
          <div className="row">
            <label className="field">
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
                autoCapitalize="characters"
              />
            </label>
          </div>
          <div className="row-2">
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
          <div className="field">
            <span>Cor</span>
            <div className="colors" role="radiogroup" aria-label="Cor">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  role="radio"
                  aria-checked={editing.color === c}
                  className={`color ${editing.color === c ? 'on' : ''}`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                  onClick={() => setEditing({ ...editing, color: c })}
                />
              ))}
            </div>
          </div>
          <div className="actions">
            {editing.id && (
              <button
                type="button"
                className="btn danger"
                onClick={async () => {
                  if (!confirm(`Apagar o turno "${editing.name}"?`)) return
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
            <button type="button" className="btn" onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button className="btn primary">Salvar</button>
          </div>
        </form>
      ) : (
        <div className="press-room">
          <button className="btn block" onClick={() => setEditing({ ...EMPTY })}>
            <Plus size={20} strokeWidth={3} /> Novo tipo de turno
          </button>
        </div>
      )}
    </section>
  )
}
