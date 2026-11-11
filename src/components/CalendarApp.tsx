import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Paintbrush,
  Pencil,
  Plus,
  RotateCcw,
  Settings as SettingsIcon,
  Sofa,
} from 'lucide-react'
import { eventIcon } from '../lib/eventIcons'
import type { Store } from '../data/store'
import type { CalEvent, ISODate, Override, Pattern, ShiftType } from '../types'
import { addDays, diffDays, monthGrid, todayISO } from '../lib/dates'
import { patternDay, resolveDay, type DayShift } from '../lib/schedule'
import { WEEKDAYS, fmtHours, fmtLong, fmtMonthName } from '../lib/format'
import { DaySheet } from './DaySheet'
import { Settings } from './Settings'

/** Valor do "pincel": id de tipo de turno, 'off' (folga) ou 'clear' (voltar à escala). */
export type Brush = string

/** Até quantos dias à frente procurar o próximo plantão. */
const LOOKAHEAD = 60

interface Props {
  store: Store
  account: string
  signOutLabel?: string
  onSignOut: () => void
}

const shiftStyle = (color: string) => ({ '--shift': color }) as React.CSSProperties

export function relativeDay(date: ISODate, today: ISODate) {
  const n = diffDays(date, today)
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  return `em ${n} dias`
}

export function CalendarApp({ store, account, signOutLabel, onSignOut }: Props) {
  const today = todayISO()
  const [view, setView] = useState<'calendar' | 'settings'>('calendar')
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }))
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  // Edições já carregadas (mês visível + próximos dias), acumuladas por data.
  const [overrides, setOverrides] = useState<Map<ISODate, Override>>(new Map())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [mode, setMode] = useState<'view' | 'paint'>('view')
  const [brush, setBrush] = useState<Brush>('off')
  const [selected, setSelected] = useState<ISODate | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const fail = useCallback((e: unknown) => setToast(e instanceof Error ? e.message : String(e)), [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const reloadBase = useCallback(async () => {
    const [st, p] = await Promise.all([store.listShiftTypes(), store.listPatterns()])
    setShiftTypes(st)
    setPatterns(p)
  }, [store])

  useEffect(() => {
    reloadBase()
      .then(() => setLoaded(true))
      .catch(fail)
  }, [reloadBase, fail])

  /** Substitui as edições de um intervalo de datas pelas recebidas do servidor. */
  const mergeOverrides = useCallback((from: ISODate, to: ISODate, list: Override[]) => {
    setOverrides((m) => {
      const n = new Map(m)
      for (const d of n.keys()) if (d >= from && d <= to) n.delete(d)
      for (const o of list) n.set(o.date, o)
      return n
    })
  }, [])

  // Próximos dias (para o cartão "Próximo plantão"), independente do mês aberto.
  useEffect(() => {
    const to = addDays(today, LOOKAHEAD)
    store
      .listOverrides(today, to)
      .then((o) => mergeOverrides(today, to, o))
      .catch(fail)
  }, [store, today, mergeOverrides, fail])

  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym])
  const from = grid[0]
  const to = grid[grid.length - 1]

  useEffect(() => {
    let cancelled = false
    Promise.all([store.listOverrides(from, to), store.listEvents(from, to)])
      .then(([o, e]) => {
        if (cancelled) return
        mergeOverrides(from, to, o)
        setEvents(e)
      })
      .catch(fail)
    return () => {
      cancelled = true
    }
  }, [store, from, to, mergeOverrides, fail])

  const typesById = useMemo(() => new Map(shiftTypes.map((s) => [s.id, s])), [shiftTypes])

  const eventsByDate = useMemo(() => {
    const m = new Map<ISODate, CalEvent[]>()
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e])
    for (const list of m.values()) list.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
    return m
  }, [events])

  const days = useMemo(
    () => grid.map((d) => ({ date: d, info: resolveDay(d, patterns, overrides, typesById) })),
    [grid, patterns, overrides, typesById],
  )

  const monthStats = useMemo(() => {
    let shifts = 0
    let minutes = 0
    let off = 0
    for (const { date, info } of days) {
      if (Number(date.slice(5, 7)) !== ym.m) continue
      if (info?.shiftTypeId) {
        shifts++
        minutes += info.durationMinutes ?? 0
      } else off++
    }
    return { shifts, hours: Math.round(minutes / 60), off }
  }, [days, ym.m])

  const next = useMemo(() => {
    for (let i = 0; i <= LOOKAHEAD; i++) {
      const date = addDays(today, i)
      const info = resolveDay(date, patterns, overrides, typesById)
      if (info?.shiftTypeId) return { date, info }
    }
    return undefined
  }, [today, patterns, overrides, typesById])

  const setOne = (date: ISODate, value: Override | undefined) =>
    setOverrides((m) => {
      const n = new Map(m)
      if (value) n.set(date, value)
      else n.delete(date)
      return n
    })

  async function applyDay(date: ISODate, value: Brush) {
    const prev = overrides.get(date)
    const target = value === 'off' ? null : value
    const base = patternDay(date, patterns, typesById)
    // Pintar igual à escala (ou "voltar à escala") remove a edição em vez de gravar uma redundante.
    const sameAsPattern = value !== 'clear' && base !== undefined && base.shiftTypeId === target
    if (value === 'clear' || sameAsPattern) {
      if (!prev) return
      setOne(date, undefined)
      try {
        await store.clearOverride(date)
      } catch (e) {
        setOne(date, prev)
        fail(e)
      }
      return
    }
    if (prev && prev.shift_type_id === target && prev.source === 'manual') return
    setOne(date, { id: 'tmp', date, shift_type_id: target, source: 'manual', note: null })
    try {
      setOne(date, await store.setOverride(date, target))
    } catch (e) {
      setOne(date, prev)
      fail(e)
    }
  }

  function shiftMonth(delta: number) {
    setYm(({ y, m }) => {
      const idx = y * 12 + (m - 1) + delta
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 }
    })
  }

  if (view === 'settings') {
    return (
      <Settings
        store={store}
        shiftTypes={shiftTypes}
        patterns={patterns}
        account={account}
        signOutLabel={signOutLabel}
        onSignOut={onSignOut}
        onChanged={() => reloadBase().catch(fail)}
        onError={fail}
        onBack={() => setView('calendar')}
      />
    )
  }

  const isCurrentMonth = ym.y === Number(today.slice(0, 4)) && ym.m === Number(today.slice(5, 7))
  const selectedInfo = selected ? resolveDay(selected, patterns, overrides, typesById) : undefined

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="title">
          <small className="tnum">{ym.y}</small>
          <span className="ellipsis">{fmtMonthName(ym.m)}</span>
        </h1>
        <nav className="nav">
          <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
            <ChevronLeft size={22} strokeWidth={3} />
          </button>
          <button
            className="btn"
            disabled={isCurrentMonth}
            onClick={() => setYm({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) })}
          >
            Hoje
          </button>
          <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
            <ChevronRight size={22} strokeWidth={3} />
          </button>
        </nav>
      </header>

      <main className="content">
        {loaded && patterns.length === 0 ? (
          <div className="banner">
            <span>Configure sua escala (ex.: 12x60) para preencher o calendário sozinho.</span>
            <button className="btn primary" onClick={() => setView('settings')}>
              Configurar
            </button>
          </div>
        ) : (
          loaded && <NextShift next={next} today={today} typesById={typesById} onOpen={setSelected} />
        )}

        <div className="stats">
          <div className="stat">
            <b>{monthStats.shifts}</b>
            <span>{monthStats.shifts === 1 ? 'Plantão' : 'Plantões'}</span>
          </div>
          <div className="stat">
            <b>{monthStats.hours}</b>
            <span>Horas</span>
          </div>
          <div className="stat">
            <b>{monthStats.off}</b>
            <span>{monthStats.off === 1 ? 'Folga' : 'Folgas'}</span>
          </div>
        </div>

        <section className="card calendar" aria-label="Calendário do mês">
          <div className="weekdays" aria-hidden>
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="grid">
            {days.map(({ date, info }) => {
              const st = info?.shiftTypeId ? typesById.get(info.shiftTypeId) : undefined
              const inMonth = Number(date.slice(5, 7)) === ym.m
              const dayEvents = eventsByDate.get(date)
              const EvIcon = dayEvents ? eventIcon(dayEvents[0]).Icon : null
              const edited = info && info.source !== 'pattern' ? info.source : null
              const classes = ['cell', inMonth ? '' : 'out', date === today ? 'today' : '', st ? 'work' : '']
              return (
                <button
                  key={date}
                  className={classes.join(' ')}
                  style={st ? shiftStyle(st.color) : undefined}
                  tabIndex={inMonth ? 0 : -1}
                  aria-label={fmtLong(date)}
                  onClick={() => (mode === 'paint' ? applyDay(date, brush) : setSelected(date))}
                >
                  <span className="num">
                    {Number(date.slice(8))}
                    {edited === 'manual' && <Pencil className="m-edit" strokeWidth={3} aria-label="editado" />}
                    {edited === 'swap' && <ArrowLeftRight className="m-swap" strokeWidth={3} aria-label="troca" />}
                  </span>
                  {/* 2ª linha: ícone do compromisso (e "+" se houver mais) no lugar da sigla */}
                  <span className="line2">
                    {EvIcon ? (
                      <>
                        <EvIcon className="m-event" strokeWidth={2.75} />
                        {dayEvents!.length > 1 && <Plus className="m-more" strokeWidth={4} aria-label="mais compromissos" />}
                      </>
                    ) : (
                      (st?.code ?? '')
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="legend">
            <span>
              <CalendarDays className="m-event" strokeWidth={2.75} /> Compromisso
            </span>
            <span>
              <Pencil className="m-edit" strokeWidth={3} /> Editado à mão
            </span>
          </div>
        </section>
      </main>

      <footer className="bottombar">
        {mode === 'paint' && (
          <div className="tiles" role="radiogroup" aria-label="Pincel">
            {shiftTypes.map((st) => (
              <button
                key={st.id}
                role="radio"
                aria-checked={brush === st.id}
                className={`tile ${brush === st.id ? 'on' : ''}`}
                onClick={() => setBrush(st.id)}
              >
                <span className="badge" style={shiftStyle(st.color)}>
                  {st.code}
                </span>
                <span className="ellipsis">{st.name}</span>
              </button>
            ))}
            <button
              role="radio"
              aria-checked={brush === 'off'}
              className={`tile ${brush === 'off' ? 'on' : ''}`}
              onClick={() => setBrush('off')}
            >
              <span className="badge off">
                <Sofa strokeWidth={2.5} />
              </span>
              <span className="ellipsis">Folga</span>
            </button>
            <button
              role="radio"
              aria-checked={brush === 'clear'}
              className={`tile ${brush === 'clear' ? 'on' : ''}`}
              onClick={() => setBrush('clear')}
            >
              <span className="badge off">
                <RotateCcw strokeWidth={2.5} />
              </span>
              <span className="ellipsis">Voltar à escala</span>
            </button>
          </div>
        )}
        <div className="bar-row">
          <div className="segmented" role="tablist">
            <button role="tab" aria-selected={mode === 'view'} className={mode === 'view' ? 'on' : ''} onClick={() => setMode('view')}>
              <Eye size={18} strokeWidth={2.5} /> Ver
            </button>
            <button
              role="tab"
              aria-selected={mode === 'paint'}
              className={mode === 'paint' ? 'on' : ''}
              onClick={() => setMode('paint')}
            >
              <Paintbrush size={18} strokeWidth={2.5} /> Pintar dias
            </button>
          </div>
          <button className="icon-btn lg" onClick={() => setView('settings')} aria-label="Configurações">
            <SettingsIcon size={22} strokeWidth={2.5} />
          </button>
        </div>
      </footer>

      {selected && (
        <DaySheet
          date={selected}
          info={selectedInfo}
          shiftTypes={shiftTypes}
          typesById={typesById}
          events={eventsByDate.get(selected) ?? []}
          onApply={(v) => applyDay(selected, v)}
          onSaveEvent={async (e) => {
            try {
              const saved = await store.saveEvent(e)
              setEvents((list) => [...list.filter((x) => x.id !== saved.id), saved])
              return true
            } catch (err) {
              fail(err)
              return false
            }
          }}
          onDeleteEvent={async (id) => {
            try {
              await store.deleteEvent(id)
              setEvents((list) => list.filter((x) => x.id !== id))
            } catch (err) {
              fail(err)
            }
          }}
          onClose={() => setSelected(null)}
        />
      )}

      {toast && (
        <div className="toast" role="alert" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </div>
  )
}

function NextShift({
  next,
  today,
  typesById,
  onOpen,
}: {
  next: { date: ISODate; info: DayShift } | undefined
  today: ISODate
  typesById: Map<string, ShiftType>
  onOpen: (d: ISODate) => void
}) {
  if (!next) {
    return (
      <section className="card next">
        <span className="badge lg off">
          <Sofa size={26} strokeWidth={2.5} />
        </span>
        <div>
          <div className="label">Próximo plantão</div>
          <div className="when">Nenhum nos próximos {LOOKAHEAD} dias</div>
        </div>
      </section>
    )
  }
  const st = typesById.get(next.info.shiftTypeId!)
  const hours =
    next.info.startMinutes !== undefined ? fmtHours(next.info.startMinutes, next.info.durationMinutes ?? 0) : ''
  return (
    <section className="card next" onClick={() => onOpen(next.date)} role="button" tabIndex={0}>
      <span className="badge lg" style={shiftStyle(st?.color ?? '#888')}>
        {st?.code}
      </span>
      <div className="grow">
        <div className="label">Próximo plantão · {relativeDay(next.date, today)}</div>
        <div className="when ellipsis">{fmtLong(next.date)}</div>
        <div className="meta ellipsis tnum">
          {hours}
          {st ? ` · ${st.name}` : ''}
        </div>
      </div>
    </section>
  )
}
