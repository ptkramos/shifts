import { useState, type FormEvent } from 'react'
import { Plus, RotateCcw, Sofa, Trash2, X } from 'lucide-react'
import type { NewEvent } from '../data/store'
import type { CalEvent, ISODate, ShiftType } from '../types'
import type { DayShift } from '../lib/schedule'
import { fmtHours, fmtLong } from '../lib/format'
import { EVENT_ICONS, eventIcon, suggestIcon } from '../lib/eventIcons'
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

interface Draft {
  id?: string
  title: string
  start: string
  end: string
  note: string
  icon: string
  /** true depois que a pessoa escolhe um ícone à mão (para de sugerir pelo título) */
  iconPicked: boolean
}

const SOURCE_LABEL = { pattern: 'Pela escala', manual: 'Editado à mão', swap: 'Troca' } as const
const shiftStyle = (color: string) => ({ '--shift': color }) as React.CSSProperties
const NEW_DRAFT: Draft = { title: '', start: '', end: '', note: '', icon: 'general', iconPicked: false }

function eventSubtitle(ev: CalEvent) {
  const time = ev.start_time ? (ev.end_time ? `${ev.start_time}–${ev.end_time}` : ev.start_time) : 'Dia todo'
  return [time, ev.note].filter(Boolean).join(' · ')
}

export function DaySheet({ date, info, shiftTypes, typesById, events, onApply, onSaveEvent, onDeleteEvent, onClose }: Props) {
  const st = info?.shiftTypeId ? typesById.get(info.shiftTypeId) : undefined
  const [draft, setDraft] = useState<Draft | null>(null)

  function edit(ev: CalEvent) {
    setDraft({
      id: ev.id,
      title: ev.title,
      start: ev.start_time ?? '',
      end: ev.end_time ?? '',
      note: ev.note ?? '',
      icon: eventIcon(ev).id,
      iconPicked: !!ev.icon,
    })
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    const ok = await onSaveEvent({
      id: draft.id,
      title: draft.title.trim(),
      date,
      start_time: draft.start || null,
      end_time: draft.end || null,
      note: draft.note.trim() || null,
      icon: draft.icon,
    })
    if (ok) setDraft(null)
  }

  let status: string
  if (!info) status = 'Sem escala configurada'
  else if (st) status = st.name
  else status = 'Folga'
  const hours = st && info?.startMinutes !== undefined ? fmtHours(info.startMinutes, info.durationMinutes ?? 0) : null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={fmtLong(date)}>
        <div className="sheet-handle" />
        <header className="sheet-head">
          <h2>{fmtLong(date)}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={20} strokeWidth={3} />
          </button>
        </header>

        <div className="card status">
          {st ? (
            <span className="badge lg" style={shiftStyle(st.color)}>
              {st.code}
            </span>
          ) : (
            <span className="badge lg off">
              <Sofa size={26} strokeWidth={2.5} />
            </span>
          )}
          <div className="grow">
            <strong className="ellipsis">{status}</strong>
            <div className="muted small tnum">
              {[hours, info ? SOURCE_LABEL[info.source] : null].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        <div>
          <h3 className="section-title">Mudar este dia</h3>
          <div className="tiles">
            {shiftTypes.map((t) => (
              <button key={t.id} className={`tile ${info?.shiftTypeId === t.id ? 'on' : ''}`} onClick={() => onApply(t.id)}>
                <span className="badge" style={shiftStyle(t.color)}>
                  {t.code}
                </span>
                <span className="ellipsis">{t.name}</span>
              </button>
            ))}
            <button className={`tile ${info && !info.shiftTypeId ? 'on' : ''}`} onClick={() => onApply('off')}>
              <span className="badge off">
                <Sofa strokeWidth={2.5} />
              </span>
              <span className="ellipsis">Folga</span>
            </button>
            <button className="tile" disabled={!info || info.source === 'pattern'} onClick={() => onApply('clear')}>
              <span className="badge off">
                <RotateCcw strokeWidth={2.5} />
              </span>
              <span className="ellipsis">Voltar à escala</span>
            </button>
          </div>
        </div>

        <div>
          <h3 className="section-title">Compromissos</h3>
          <div className="card">
            {draft ? (
              <form className="form" onSubmit={save}>
                <label className="field">
                  <span>Título</span>
                  <input
                    value={draft.title}
                    onChange={(e) => {
                      const title = e.target.value
                      setDraft({ ...draft, title, icon: draft.iconPicked ? draft.icon : (suggestIcon(title) ?? 'general') })
                    }}
                    required
                    maxLength={120}
                    autoFocus={!draft.id}
                  />
                </label>
                <div className="field">
                  <span>Ícone · {EVENT_ICONS.find((i) => i.id === draft.icon)?.label}</span>
                  <div className="icon-grid" role="radiogroup" aria-label="Ícone">
                    {EVENT_ICONS.map(({ id, label, Icon }) => (
                      <button
                        type="button"
                        key={id}
                        role="radio"
                        aria-checked={draft.icon === id}
                        aria-label={label}
                        title={label}
                        className={`icon-opt ${draft.icon === id ? 'on' : ''}`}
                        onClick={() => setDraft({ ...draft, icon: id, iconPicked: true })}
                      >
                        <Icon size={20} strokeWidth={2.5} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="row-2">
                  <label className="field">
                    <span>Início</span>
                    <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Fim</span>
                    <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
                  </label>
                </div>
                <label className="field">
                  <span>Anotação</span>
                  <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                </label>
                <div className="actions">
                  <button type="button" className="btn" onClick={() => setDraft(null)}>
                    Cancelar
                  </button>
                  <button className="btn primary">Salvar</button>
                </div>
              </form>
            ) : events.length === 0 ? (
              <p className="empty">Nenhum compromisso neste dia.</p>
            ) : (
              <ul className="list">
                {events.map((ev) => {
                  const { Icon } = eventIcon(ev)
                  return (
                    <li key={ev.id}>
                      <span className="ev-icon">
                        <Icon size={20} strokeWidth={2.5} />
                      </span>
                      <button className="ev-open" onClick={() => edit(ev)} aria-label={`Editar ${ev.title}`}>
                        <strong className="ellipsis">{ev.title}</strong>
                        <span className="muted small ellipsis tnum">{eventSubtitle(ev)}</span>
                      </button>
                      <button
                        className="icon-btn flat danger"
                        onClick={() => onDeleteEvent(ev.id)}
                        aria-label={`Apagar ${ev.title}`}
                      >
                        <Trash2 size={20} strokeWidth={2.5} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {!draft && (
          <div className="press-room">
            <button className="btn block" onClick={() => setDraft({ ...NEW_DRAFT })}>
              <Plus size={20} strokeWidth={3} /> Adicionar compromisso
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
