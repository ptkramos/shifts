import type { ISODate, Override, Pattern, ShiftType } from '../types'
import { diffDays, timeToMinutes } from './dates'

export type DaySource = 'pattern' | 'manual' | 'swap'

export interface DayShift {
  /** null = folga */
  shiftTypeId: string | null
  source: DaySource
  /** Início do turno em minutos desde 00:00 (quando há turno). */
  startMinutes?: number
  /** Duração em minutos (quando há turno). */
  durationMinutes?: number
}

/** Escala vigente no dia: a de maior anchor_date que não seja depois do dia. */
export function effectivePattern(patterns: Pattern[], date: ISODate): Pattern | undefined {
  let best: Pattern | undefined
  for (const p of patterns) {
    if (p.anchor_date <= date && (!best || p.anchor_date > best.anchor_date)) best = p
  }
  return best
}

/**
 * Turno que a escala gera no dia (ignorando edições).
 * Funciona para qualquer ciclo em horas (12x36, 12x60, 24x48, 12x24...), não só múltiplos de 24h.
 * Retorna undefined se não há escala vigente.
 */
export function patternDay(
  date: ISODate,
  patterns: Pattern[],
  shiftTypes: Map<string, ShiftType>,
): DayShift | undefined {
  const p = effectivePattern(patterns, date)
  if (!p) return undefined
  const st = shiftTypes.get(p.shift_type_id)
  const firstStart = st ? timeToMinutes(st.start_time) : 0
  const cycle = (p.on_hours + p.off_hours) * 60
  const dayIdx = diffDays(date, p.anchor_date)
  // Turno k começa em firstStart + k*cycle (minutos desde 00:00 do anchor).
  // Queremos algum k >= 0 cujo início caia em [dayIdx*1440, (dayIdx+1)*1440).
  const kMin = Math.max(0, Math.ceil((dayIdx * 1440 - firstStart) / cycle))
  const startAbs = firstStart + kMin * cycle
  if (startAbs < (dayIdx + 1) * 1440) {
    return {
      shiftTypeId: p.shift_type_id,
      source: 'pattern',
      startMinutes: startAbs - dayIdx * 1440,
      durationMinutes: p.on_hours * 60,
    }
  }
  return { shiftTypeId: null, source: 'pattern' }
}

/** Situação final do dia: edição (manual/troca) vence a escala. undefined = sem escala e sem edição. */
export function resolveDay(
  date: ISODate,
  patterns: Pattern[],
  overrides: Map<ISODate, Override>,
  shiftTypes: Map<string, ShiftType>,
): DayShift | undefined {
  const o = overrides.get(date)
  if (o) {
    if (!o.shift_type_id) return { shiftTypeId: null, source: o.source }
    const st = shiftTypes.get(o.shift_type_id)
    if (!st) return { shiftTypeId: o.shift_type_id, source: o.source }
    const start = timeToMinutes(st.start_time)
    let end = timeToMinutes(st.end_time)
    if (end <= start) end += 1440
    return { shiftTypeId: o.shift_type_id, source: o.source, startMinutes: start, durationMinutes: end - start }
  }
  return patternDay(date, patterns, shiftTypes)
}
