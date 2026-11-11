import { describe, expect, it } from 'vitest'
import type { Override, Pattern, ShiftType } from '../types'
import { addDays, monthGrid } from './dates'
import { patternDay, resolveDay } from './schedule'

const D: ShiftType = { id: 'D', name: 'Plantão 08–20', code: 'D', color: '#000', start_time: '08:00', end_time: '20:00' }
const N: ShiftType = { id: 'N', name: 'Noite', code: 'N', color: '#000', start_time: '19:00', end_time: '07:00' }
const types = new Map([[D.id, D], [N.id, N]])
const p1260: Pattern = { id: 'p', shift_type_id: 'D', anchor_date: '2026-11-10', on_hours: 12, off_hours: 60 }

function workDays(from: string, n: number, patterns: Pattern[], overrides = new Map<string, Override>()) {
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const d = addDays(from, i)
    if (resolveDay(d, patterns, overrides, types)?.shiftTypeId) out.push(d)
  }
  return out
}

describe('escala 12x60', () => {
  it('trabalha a cada 3 dias a partir do início', () => {
    expect(workDays('2026-11-08', 12, [p1260])).toEqual(['2026-11-10', '2026-11-13', '2026-11-16', '2026-11-19'])
  })

  it('não gera nada antes do início da escala', () => {
    expect(resolveDay('2026-11-09', [p1260], new Map(), types)).toBeUndefined()
  })

  it('atravessa virada de ano e horário de verão', () => {
    const d = patternDay(addDays('2026-11-10', 3 * 100), [p1260], types)
    expect(d?.shiftTypeId).toBe('D')
    expect(d?.startMinutes).toBe(8 * 60)
  })
})

describe('outras escalas', () => {
  it('12x36 alterna dia sim, dia não', () => {
    const p: Pattern = { ...p1260, on_hours: 12, off_hours: 36 }
    expect(workDays('2026-11-10', 6, [p])).toEqual(['2026-11-10', '2026-11-12', '2026-11-14'])
  })

  it('24x72 a cada 4 dias', () => {
    const p: Pattern = { ...p1260, on_hours: 24, off_hours: 72 }
    expect(workDays('2026-11-10', 9, [p])).toEqual(['2026-11-10', '2026-11-14', '2026-11-18'])
  })

  it('12x24 (ciclo de 36h) desloca o horário', () => {
    const p: Pattern = { ...p1260, on_hours: 12, off_hours: 24 }
    expect(patternDay('2026-11-10', [p], types)?.startMinutes).toBe(8 * 60)
    expect(patternDay('2026-11-11', [p], types)?.startMinutes).toBe(20 * 60)
    expect(patternDay('2026-11-12', [p], types)?.shiftTypeId).toBeNull()
    expect(patternDay('2026-11-13', [p], types)?.startMinutes).toBe(8 * 60)
  })

  it('nova escala vale a partir da data dela, sem mudar o passado', () => {
    const nova: Pattern = { id: 'q', shift_type_id: 'D', anchor_date: '2026-11-20', on_hours: 12, off_hours: 36 }
    expect(workDays('2026-11-10', 15, [p1260, nova])).toEqual([
      '2026-11-10', '2026-11-13', '2026-11-16', '2026-11-19', '2026-11-20', '2026-11-22', '2026-11-24',
    ])
  })
})

describe('edições por dia', () => {
  const ov = (date: string, shift_type_id: string | null, source: 'manual' | 'swap' = 'manual'): Override =>
    ({ id: date, date, shift_type_id, source, note: null })

  it('troca: trabalha dois dias seguidos e depois folga 5', () => {
    const overrides = new Map([
      ['2026-11-11', ov('2026-11-11', 'D', 'swap')],
      ['2026-11-13', ov('2026-11-13', null, 'swap')],
    ])
    expect(workDays('2026-11-10', 10, [p1260], overrides)).toEqual(['2026-11-10', '2026-11-11', '2026-11-16', '2026-11-19'])
    expect(resolveDay('2026-11-13', [p1260], overrides, types)).toEqual({ shiftTypeId: null, source: 'swap' })
  })

  it('edição usa o horário do tipo de turno, inclusive noturno', () => {
    const overrides = new Map([['2026-11-11', ov('2026-11-11', 'N')]])
    expect(resolveDay('2026-11-11', [p1260], overrides, types)).toMatchObject({ startMinutes: 19 * 60, durationMinutes: 12 * 60 })
  })

  it('mudar a escala mantém as edições', () => {
    const overrides = new Map([['2026-11-11', ov('2026-11-11', 'D')]])
    const outra: Pattern = { ...p1260, on_hours: 24, off_hours: 72 }
    expect(resolveDay('2026-11-11', [outra], overrides, types)?.source).toBe('manual')
  })
})

describe('grade do mês', () => {
  it('novembro/2026 começa num domingo e fecha semanas completas', () => {
    const g = monthGrid(2026, 11)
    expect(g[0]).toBe('2026-11-01')
    expect(g.length % 7).toBe(0)
    expect(g).toContain('2026-11-30')
  })
})
