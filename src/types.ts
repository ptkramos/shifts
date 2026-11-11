/** Datas sempre como 'YYYY-MM-DD' (data local, sem fuso). Horas como 'HH:MM'. */
export type ISODate = string

export interface ShiftType {
  id: string
  name: string
  code: string
  color: string
  start_time: string
  end_time: string
}

export interface Pattern {
  id: string
  shift_type_id: string
  anchor_date: ISODate
  on_hours: number
  off_hours: number
}

export type OverrideSource = 'manual' | 'swap'

export interface Override {
  id: string
  date: ISODate
  /** null = folga */
  shift_type_id: string | null
  source: OverrideSource
  note: string | null
}

export interface CalEvent {
  id: string
  title: string
  date: ISODate
  start_time: string | null
  end_time: string | null
  note: string | null
  /** id de um ícone de src/lib/eventIcons (null = sugerido pelo título) */
  icon: string | null
}
