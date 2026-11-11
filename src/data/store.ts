import type { SupabaseClient } from '@supabase/supabase-js'
import type { CalEvent, ISODate, Override, Pattern, ShiftType } from '../types'

export type NewShiftType = Omit<ShiftType, 'id'> & { id?: string }
export type NewPattern = Omit<Pattern, 'id'>
export type NewEvent = Omit<CalEvent, 'id'> & { id?: string }

/** Acesso aos dados. Duas implementações: Supabase (real) e localStorage (demonstração). */
export interface Store {
  listShiftTypes(): Promise<ShiftType[]>
  saveShiftType(st: NewShiftType): Promise<ShiftType>
  deleteShiftType(id: string): Promise<void>
  listPatterns(): Promise<Pattern[]>
  savePattern(p: NewPattern): Promise<Pattern>
  deletePattern(id: string): Promise<void>
  listOverrides(from: ISODate, to: ISODate): Promise<Override[]>
  setOverride(date: ISODate, shiftTypeId: string | null): Promise<Override>
  clearOverride(date: ISODate): Promise<void>
  listEvents(from: ISODate, to: ISODate): Promise<CalEvent[]>
  saveEvent(e: NewEvent): Promise<CalEvent>
  deleteEvent(id: string): Promise<void>
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null)

function friendly(error: { code?: string; message: string }): Error {
  if (error.code === '23503') return new Error('Esse tipo de turno está em uso numa escala ou num dia editado.')
  return new Error(error.message)
}

function check<T>(res: { data: T | null; error: { code?: string; message: string } | null }): T {
  if (res.error) throw friendly(res.error)
  return res.data as T
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const normST = (r: any): ShiftType => ({ ...r, start_time: hhmm(r.start_time)!, end_time: hhmm(r.end_time)! })
const normEv = (r: any): CalEvent => ({ ...r, start_time: hhmm(r.start_time), end_time: hhmm(r.end_time) })

export function createSupabaseStore(sb: SupabaseClient, userId: string): Store {
  return {
    async listShiftTypes() {
      return check(await sb.from('shift_types').select('id,name,code,color,start_time,end_time').order('created_at')).map(normST)
    },
    async saveShiftType(st) {
      const row = { ...st, user_id: userId }
      return normST(check(await sb.from('shift_types').upsert(row).select().single()))
    },
    async deleteShiftType(id) {
      check(await sb.from('shift_types').delete().eq('id', id))
    },
    async listPatterns() {
      return check(await sb.from('schedule_patterns').select('id,shift_type_id,anchor_date,on_hours,off_hours').order('anchor_date'))
    },
    async savePattern(p) {
      return check(
        await sb.from('schedule_patterns').upsert({ ...p, user_id: userId }, { onConflict: 'user_id,anchor_date' }).select().single(),
      )
    },
    async deletePattern(id) {
      check(await sb.from('schedule_patterns').delete().eq('id', id))
    },
    async listOverrides(from, to) {
      return check(
        await sb.from('day_overrides').select('id,date,shift_type_id,source,note').gte('date', from).lte('date', to),
      )
    },
    async setOverride(date, shiftTypeId) {
      return check(
        await sb
          .from('day_overrides')
          .upsert(
            { user_id: userId, date, shift_type_id: shiftTypeId, source: 'manual', updated_at: new Date().toISOString() },
            { onConflict: 'user_id,date' },
          )
          .select('id,date,shift_type_id,source,note')
          .single(),
      )
    },
    async clearOverride(date) {
      check(await sb.from('day_overrides').delete().eq('user_id', userId).eq('date', date))
    },
    async listEvents(from, to) {
      return check(
        await sb.from('events').select('id,title,date,start_time,end_time,note,icon').gte('date', from).lte('date', to).order('start_time'),
      ).map(normEv)
    },
    async saveEvent(e) {
      return normEv(check(await sb.from('events').upsert({ ...e, user_id: userId }).select().single()))
    },
    async deleteEvent(id) {
      check(await sb.from('events').delete().eq('id', id))
    },
  }
}

/* ------------------------------------------------------------------------- */
/* Modo demonstração: tudo no navegador, sem conta.                           */
/* ------------------------------------------------------------------------- */

interface LocalDB {
  shiftTypes: ShiftType[]
  patterns: Pattern[]
  overrides: Override[]
  events: CalEvent[]
}

const KEY = 'mycalendar-demo-v1'

function seed(): LocalDB {
  return {
    shiftTypes: [
      { id: crypto.randomUUID(), name: 'Plantão 08–20', code: 'D', color: '#2563eb', start_time: '08:00', end_time: '20:00' },
      { id: crypto.randomUUID(), name: 'Plantão 07–19', code: '7', color: '#7c3aed', start_time: '07:00', end_time: '19:00' },
    ],
    patterns: [],
    overrides: [],
    events: [],
  }
}

export function createLocalStore(): Store {
  let db: LocalDB
  try {
    db = JSON.parse(localStorage.getItem(KEY) ?? '') as LocalDB
  } catch {
    db = seed()
  }
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db))
    } catch {
      /* sem armazenamento: segue só em memória */
    }
  }
  save()
  const inUse = (id: string) =>
    db.patterns.some((p) => p.shift_type_id === id) || db.overrides.some((o) => o.shift_type_id === id)

  return {
    async listShiftTypes() {
      return [...db.shiftTypes]
    },
    async saveShiftType(st) {
      const row: ShiftType = { ...st, id: st.id ?? crypto.randomUUID() }
      db.shiftTypes = st.id ? db.shiftTypes.map((s) => (s.id === st.id ? row : s)) : [...db.shiftTypes, row]
      save()
      return row
    },
    async deleteShiftType(id) {
      if (inUse(id)) throw new Error('Esse tipo de turno está em uso numa escala ou num dia editado.')
      db.shiftTypes = db.shiftTypes.filter((s) => s.id !== id)
      save()
    },
    async listPatterns() {
      return [...db.patterns].sort((a, b) => a.anchor_date.localeCompare(b.anchor_date))
    },
    async savePattern(p) {
      const existing = db.patterns.find((x) => x.anchor_date === p.anchor_date)
      const row: Pattern = { ...p, id: existing?.id ?? crypto.randomUUID() }
      db.patterns = [...db.patterns.filter((x) => x.anchor_date !== p.anchor_date), row]
      save()
      return row
    },
    async deletePattern(id) {
      db.patterns = db.patterns.filter((p) => p.id !== id)
      save()
    },
    async listOverrides(from, to) {
      return db.overrides.filter((o) => o.date >= from && o.date <= to)
    },
    async setOverride(date, shiftTypeId) {
      const row: Override = { id: crypto.randomUUID(), date, shift_type_id: shiftTypeId, source: 'manual', note: null }
      db.overrides = [...db.overrides.filter((o) => o.date !== date), row]
      save()
      return row
    },
    async clearOverride(date) {
      db.overrides = db.overrides.filter((o) => o.date !== date)
      save()
    },
    async listEvents(from, to) {
      return db.events.filter((e) => e.date >= from && e.date <= to)
    },
    async saveEvent(e) {
      const row: CalEvent = { ...e, id: e.id ?? crypto.randomUUID() }
      db.events = e.id ? db.events.map((x) => (x.id === e.id ? row : x)) : [...db.events, row]
      save()
      return row
    },
    async deleteEvent(id) {
      db.events = db.events.filter((e) => e.id !== id)
      save()
    },
  }
}
