import { describe, it, expect } from 'vitest'
import type { FurikaeriEntriesMap } from '../types/furikaeri'
import {
  filterSortedDates,
  escapeRegExp,
  splitForHighlight,
} from './furikaeriFilters'

const sample: FurikaeriEntriesMap = {
  '2024-03-01': { date: '2024-03-01', events: 'Alpha meeting', pinned: true },
  '2024-03-02': { date: '2024-03-02', events: 'Beta rest', tags: ['仕事'] },
  '2024-02-01': { date: '2024-02-01', events: 'Old day' },
}

describe('filterSortedDates', () => {
  it('filters by query (case-insensitive)', () => {
    const out = filterSortedDates(sample, {
      query: 'alpha',
      dateFrom: '',
      dateTo: '',
      tagFilter: [],
      favoritesOnly: false,
    })
    expect(out).toContain('2024-03-01')
    expect(out).not.toContain('2024-03-02')
  })

  it('pins first in sort', () => {
    const out = filterSortedDates(sample, {
      query: '',
      dateFrom: '',
      dateTo: '',
      tagFilter: [],
      favoritesOnly: false,
    })
    expect(out[0]).toBe('2024-03-01')
  })

  it('filters by tag', () => {
    const out = filterSortedDates(sample, {
      query: '',
      dateFrom: '',
      dateTo: '',
      tagFilter: ['仕事'],
      favoritesOnly: false,
    })
    expect(out).toEqual(['2024-03-02'])
  })

  it('filters favorites only', () => {
    const out = filterSortedDates(sample, {
      query: '',
      dateFrom: '',
      dateTo: '',
      tagFilter: [],
      favoritesOnly: true,
    })
    expect(out).toEqual(['2024-03-01'])
  })
})

describe('escapeRegExp', () => {
  it('escapes special regex characters', () => {
    expect(escapeRegExp('a.b')).toBe('a\\.b')
    expect(escapeRegExp('[test]')).toBe('\\[test\\]')
  })
})

describe('splitForHighlight', () => {
  it('returns single chunk when query empty', () => {
    expect(splitForHighlight('hello', '')).toEqual([{ text: 'hello', hit: false }])
  })

  it('marks hits', () => {
    const parts = splitForHighlight('foo BAR foo', 'bar')
    expect(parts.some((p) => p.hit && p.text.toLowerCase() === 'bar')).toBe(true)
  })
})
