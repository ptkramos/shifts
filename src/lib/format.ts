import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ISODate, Pattern, ShiftType } from '../types'
import { minutesToTime } from './dates'

export const fmtLong = (d: ISODate) => format(parseISO(d), "EEEE, d 'de' MMMM", { locale: ptBR })
export const fmtShort = (d: ISODate) => format(parseISO(d), 'dd/MM/yyyy')
export const fmtMonth = (y: number, m: number) =>
  format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: ptBR })

export const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function fmtHours(startMinutes: number, durationMinutes: number) {
  return `${minutesToTime(startMinutes)}–${minutesToTime(startMinutes + durationMinutes)}`
}

export const patternLabel = (p: Pattern) => `${p.on_hours}x${p.off_hours}`

export const shiftHours = (st: ShiftType) => `${st.start_time}–${st.end_time}`
