import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Store } from '../data/store'
import type { CalEvent, ISODate, Override, Pattern, ShiftType } from '../types'
import { monthGrid, todayISO } from '../lib/dates'
import { patternDay, resolveDay } from '../lib/schedule'
import { WEEKDAYS, fmtMonth } from '../lib/format'
import { DaySheet } from './DaySheet'
import { Settings } from './Settings'

/** Valor do "pincel": id de tipo de turno, 'off' (folga) ou 'clear' (voltar à escala). */
export type Brush = string

interface Props {
  store: Store
  account: string
  signOutLabel?: string
  onSignOut: () => void
}

export function CalendarApp({ store, account, signOutLabel, onSignOut }: Props) {
  const today = todayISO()
  const [view, setView] = useState<'calendar' | 'settings'>('calendar')
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }))
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
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

  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym])
  const from = grid[0]
  const to = grid[grid.length - 1]

  useEffect(() => {
    let cancelled = false
    Promise.all([store.listOverrides(from, to), store.listEvents(from, to)])
      .then(([o, e]) => {
        if (cancelled) return
        setOverrides(new Map(o.map((x) => [x.date, x])))
        setEvents(e)
      })
      .catch(fail)
    return () => {
      cancelled = true
    }
  }, [store, from, to, fail])

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
    let count = 0
    let minutes = 0
    for (const { date, info } of days) {
      if (Number(date.slice(5, 7)) !== ym.m || !info?.shiftTypeId) continue
      count++
      minutes += info.durationMinutes ?? 0
    }
    return { count, hours: Math.round(minutes / 60) }
  }, [days, ym.m])

  const restore = (date: ISODate, prev: Override | undefined) =>
    setOverrides((m) => {
      const n = new Map(m)
      if (prev) n.set(date, prev)
      else n.delete(date)
      return n
    })

  async function applyDay(date: ISODate, value: Brush) {
    const prev = overrides.get(date)
    const target = value === 'off' ? null : value
    const base = patternDay(date, patterns, typesById)
    // Pintar igual à escala (ou "desfazer") remove a edição em vez de gravar uma redundante.
    const sameAsPattern = value !== 'clear' && base !== undefined && base.shiftTypeId === target
    if (value === 'clear' || sameAsPattern) {
      if (!prev) return
      restore(date, undefined)
      try {
        await store.clearOverride(date)
      } catch (e) {
        restore(date, prev)
        fail(e)
      }
      return
    }
    if (prev && prev.shift_type_id === target && prev.source === 'manual') return
    restore(date, { id: 'tmp', date, shift_type_id: target, source: 'manual', note: null })
    try {
      const saved = await store.setOverride(date, target)
      restore(date, saved)
    } catch (e) {
      restore(date, prev)
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

  const selectedInfo = selected ? days.find((d) => d.date === selected)?.info : undefined

  return (
    <div className={`app ${mode === 'paint' ? 'painting' : ''}`}>
      <header className="topbar">
        <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
          ‹
        </button>
        <h1 className="month-title">{fmtMonth(ym.y, ym.m)}</h1>
        <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
          ›
        </button>
        <div className="spacer" />
        <button
          className="btn small"
          onClick={() => setYm({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) })}
        >
          Hoje
        </button>
        <button className="icon-btn" onClick={() => setView('settings')} aria-label="Configurações">
          ⚙
        </button>
      </header>

      {loaded && patterns.length === 0 && (
        <div className="banner">
          <span>Configure sua escala (ex.: 12x60) para preencher o calendário automaticamente.</span>
          <button className="btn small primary" onClick={() => setView('settings')}>
            Configurar
          </button>
        </div>
      )}

      <div className="stats">
        {monthStats.count} {monthStats.count === 1 ? 'plantão' : 'plantões'} · {monthStats.hours}h no mês
      </div>

      <div className="weekdays">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="grid">
        {days.map(({ date, info }) => {
          const st = info?.shiftTypeId ? typesById.get(info.shiftTypeId) : undefined
          const inMonth = Number(date.slice(5, 7)) === ym.m
          const dayEvents = eventsByDate.get(date)
          const classes = ['cell', inMonth ? '' : 'out', date === today ? 'today' : '', st ? 'work' : '']
          return (
            <button
              key={date}
              className={classes.join(' ')}
              style={st ? ({ '--shift': st.color } as React.CSSProperties) : undefined}
              onClick={() => (mode === 'paint' ? applyDay(date, brush) : setSelected(date))}
            >
              <span className="num">{Number(date.slice(8))}</span>
              {st && <span className="code">{st.code}</span>}
              {info && info.source !== 'pattern' && (
                <span
                  className={`mark ${info.source}`}
                  title={info.source === 'swap' ? 'Troca' : 'Editado manualmente'}
                />
              )}
              {dayEvents && (
                <span className="dots">
                  {dayEvents.slice(0, 3).map((e) => (
                    <i key={e.id} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="legend muted small">
        <span className="mark manual inline" /> editado à mão · <span className="dot-inline" /> compromisso
      </p>

      <footer className="bottombar">
        <div className="segmented">
          <button className={mode === 'view' ? 'on' : ''} onClick={() => setMode('view')}>
            Ver
          </button>
          <button className={mode === 'paint' ? 'on' : ''} onClick={() => setMode('paint')}>
            Pintar dias
          </button>
        </div>
        {mode === 'paint' && (
          <div className="palette">
            {shiftTypes.map((st) => (
              <button
                key={st.id}
                className={`swatch ${brush === st.id ? 'on' : ''}`}
                style={{ '--shift': st.color } as React.CSSProperties}
                onClick={() => setBrush(st.id)}
              >
                <b>{st.code}</b>
                {st.name}
              </button>
            ))}
            <button className={`swatch off ${brush === 'off' ? 'on' : ''}`} onClick={() => setBrush('off')}>
              <b>–</b>Folga
            </button>
            <button className={`swatch clear ${brush === 'clear' ? 'on' : ''}`} onClick={() => setBrush('clear')}>
              <b>↺</b>Voltar à escala
            </button>
          </div>
        )}
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
