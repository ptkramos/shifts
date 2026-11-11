import type { ISODate } from '../types'

const DAY_MS = 86_400_000

/** Número do dia (dias desde 1970-01-01), calculado em UTC para não sofrer com horário de verão/fuso. */
export function dayNumber(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS)
}

export function fromDayNumber(n: number): ISODate {
  return new Date(n * DAY_MS).toISOString().slice(0, 10)
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromDayNumber(dayNumber(iso) + days)
}

export function diffDays(a: ISODate, b: ISODate): number {
  return dayNumber(a) - dayNumber(b)
}

/** Data de hoje no relógio do aparelho. */
export function todayISO(): ISODate {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Dia da semana (0 = domingo). */
export function weekday(iso: ISODate): number {
  return new Date(dayNumber(iso) * DAY_MS).getUTCDay()
}

/** Dias exibidos na grade do mês (semanas começando no domingo). month: 1–12. */
export function monthGrid(year: number, month: number): ISODate[] {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const start = addDays(first, -weekday(first))
  const cells = Math.ceil((weekday(first) + daysInMonth) / 7) * 7
  return Array.from({ length: cells }, (_, i) => addDays(start, i))
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
