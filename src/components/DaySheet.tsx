import { useState, type FormEvent } from 'react'
import type { NewEvent } from '../data/store'
import type { CalEvent, ISODate, ShiftType } from '../types'
import type { DayShift } from '../lib/schedule'
import { fmtHours, fmtLong } from '../lib/format'
import type { Brush } from './CalendarApp'

interface Props {
  date: ISODate
  info: DayShift | undefined
  shiftTypes: ShiftType[]
  typesById: Map<string, ShiftType>
  events: CalEvent[]
  onApply: (v: Brush) => void
  onSaveEvent: (e: NewEvent) => Promise<boolean>
  onDeleteEvent: (id: string) => void
  onClose: () => void
}

const SOURCE_LABEL = { pattern: 'pela escala', manual: 'editado à mão', swap: 'troca' } as const

export function DaySheet({ date, info, shiftTypes, typesById, events, onApply, onSaveEvent, onDeleteEvent, onClose }: Props) {
  const st = info?.shiftTypeId ? typesById.get(info.shiftTypeId) : undefined
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')

  async function addEvent(e: FormEvent) {
    e.preventDefault()
    const ok = await onSaveEvent({
      title: title.trim(),
      date,
      start_time: start || null,
      end_time: end || null,
      note: note.trim() || null,
    })
    if (ok) {
      setTitle('')
      setStart('')
      setEnd('')
      setNote('')
      setAdding(false)
    }
  }

  let status: string
  if (!info) status = 'Sem escala configurada'
  else if (st) status = `${st.name}${info.startMinutes !== undefined ? ` · ${fmtHours(info.startMinutes, info.durationMinutes ?? 0)}` : ''}`
  else status = 'Folga'

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={fmtLong(date)}>
        <div className="sheet-handle" />
        <header className="sheet-head">
          <h2>{fmtLong(date)}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="status" style={st ? ({ '--shift': st.color } as React.CSSProperties) : undefined}>
          {st && <span className="code big">{st.code}</span>}
          <div>
            <strong>{status}</strong>
            {info && <div className="muted small">{SOURCE_LABEL[info.source]}</div>}
          </div>
        </div>

        <h3>Mudar este dia</h3>
        <div className="choices">
          {shiftTypes.map((t) => (
            <button
              key={t.id}
              className={`swatch ${info?.shiftTypeId === t.id ? 'on' : ''}`}
              style={{ '--shift': t.color } as React.CSSProperties}
              onClick={() => onApply(t.id)}
            >
              <b>{t.code}</b>
              {t.name}
            </button>
          ))}
          <button className={`swatch off ${info && !info.shiftTypeId ? 'on' : ''}`} onClick={() => onApply('off')}>
            <b>–</b>Folga
          </button>
          {info && info.source !== 'pattern' && (
            <button className="swatch clear" onClick={() => onApply('clear')}>
              <b>↺</b>Voltar à escala
            </button>
          )}
        </div>

        <h3>Compromissos</h3>
        {events.length === 0 && !adding && <p className="muted small">Nenhum compromisso.</p>}
        <ul className="events">
          {events.map((ev) => (
            <li key={ev.id}>
              <div>
                <strong>{ev.title}</strong>
                <div className="muted small">
                  {ev.start_time ? `${ev.start_time}${ev.end_time ? `–${ev.end_time}` : ''}` : 'Dia todo'}
                  {ev.note ? ` · ${ev.note}` : ''}
                </div>
              </div>
              <button className="icon-btn danger" onClick={() => onDeleteEvent(ev.id)} aria-label={`Apagar ${ev.title}`}>
                🗑
              </button>
            </li>
          ))}
        </ul>

        {adding ? (
          <form className="event-form" onSubmit={addEvent}>
            <label className="field">
              <span>Título</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} autoFocus />
            </label>
            <div className="row">
              <label className="field">
                <span>Início</span>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
              <label className="field">
                <span>Fim</span>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>Anotação</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div className="row">
              <button type="button" className="btn" onClick={() => setAdding(false)}>
                Cancelar
              </button>
              <button className="btn primary">Salvar</button>
            </div>
          </form>
        ) : (
          <button className="btn block" onClick={() => setAdding(true)}>
            + Adicionar compromisso
          </button>
        )}
      </section>
    </div>
  )
}
