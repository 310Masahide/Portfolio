import { describe, it, expect } from 'vitest'
import { normalizeStoredFurikaeriEntry } from './furikaeriEntryNormalize'

describe('normalizeStoredFurikaeriEntry', () => {
  it('returns null for non-objects', () => {
    expect(normalizeStoredFurikaeriEntry(null)).toBeNull()
    expect(normalizeStoredFurikaeriEntry('x')).toBeNull()
    expect(normalizeStoredFurikaeriEntry(1)).toBeNull()
  })

  it('requires YYYY-MM-DD shaped date string', () => {
    expect(normalizeStoredFurikaeriEntry({ date: 'bad' })).toBeNull()
    expect(normalizeStoredFurikaeriEntry({ date: '2025-1-1' })).toBeNull()
  })

  it('uses keyFallback when date invalid but key is valid', () => {
    const o = { events: 'hello', pinned: true }
    const r = normalizeStoredFurikaeriEntry(o, '2024-06-15')
    expect(r).toEqual({
      date: '2024-06-15',
      events: 'hello',
      pinned: true,
      tags: undefined,
      aiResponse: undefined,
    })
  })

  it('normalizes tags to unique strings', () => {
    const r = normalizeStoredFurikaeriEntry(
      {
        date: '2024-01-01',
        tags: ['a', 'b', 'a', 3, 'b'],
      },
      '2024-01-01',
    )
    expect(r?.tags).toEqual(['a', 'b'])
  })
})
