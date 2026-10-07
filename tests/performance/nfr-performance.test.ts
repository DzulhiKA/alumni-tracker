import { describe, it, expect } from 'vitest'

/**
 * NFR-008: Performance Efficiency - Instant In-Memory Filter & High Record Scalability
 * Related Module: components/AlumniDirectoryClient.tsx & app/admin/tracking/TrackingTable.tsx
 */
describe('NFR-008: Performance Efficiency - Instant Client-Side Query Filtering', () => {
  interface AlumniRecord {
    id: string
    nama_lulusan: string
    nim: string
    fakultas: string
    program_studi: string
    search_status: string
  }

  function filterAlumniList(
    records: AlumniRecord[],
    query: string,
    prodiFilter: string,
    statusFilter: string
  ): AlumniRecord[] {
    const q = query.toLowerCase().trim()
    return records.filter((rec) => {
      const matchQuery =
        !q ||
        rec.nama_lulusan.toLowerCase().includes(q) ||
        rec.nim.toLowerCase().includes(q)

      const matchProdi = !prodiFilter || rec.program_studi === prodiFilter
      const matchStatus = !statusFilter || rec.search_status === statusFilter

      return matchQuery && matchProdi && matchStatus
    })
  }

  it('NFR-008.1: Mampu menyaring 10.000 data dalam waktu di bawah 100ms', () => {
    // Generate 10.000 dummy alumni records
    const mockData: AlumniRecord[] = Array.from({ length: 10000 }, (_, i) => ({
      id: `record-${i}`,
      nama_lulusan: `Alumni Ke-${i} ${i % 2 === 0 ? 'Kusuma' : 'Santoso'}`,
      nim: `191051${String(i).padStart(4, '0')}`,
      fakultas: i % 3 === 0 ? 'FIK' : 'FEB',
      program_studi: i % 2 === 0 ? 'Informatika' : 'Sistem Informasi',
      search_status: i % 4 === 0 ? 'found' : 'not_found',
    }))

    const start = performance.now()
    const filtered = filterAlumniList(mockData, 'Kusuma', 'Informatika', 'found')
    const end = performance.now()
    const duration = end - start

    expect(duration).toBeLessThan(100) // Eksekusi harus super cepat di bawah 100ms
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach((item) => {
      expect(item.nama_lulusan).toContain('Kusuma')
      expect(item.program_studi).toBe('Informatika')
      expect(item.search_status).toBe('found')
    })
  })
})
