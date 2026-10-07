import { describe, it, expect } from 'vitest'

/**
 * NFR-007: Reliability - Batch Data Processing & Fault Tolerance
 * Related Module: app/api/admin/import-alumni/route.ts
 */
describe('NFR-007: Reliability - Fault Tolerance & Resilience on Data Ingestion', () => {
  interface ImportRow {
    nama_lulusan: string
    nim: string
    tahun_masuk?: number
    tanggal_lulus?: string
    fakultas?: string
    program_studi?: string
  }

  function processBatchImport(rows: ImportRow[], existingNims: Set<string>) {
    let imported = 0
    let skipped = 0
    let errors = 0
    const processed: ImportRow[] = []

    for (const r of rows) {
      // 1. Validasi integritas kolom wajib
      if (!r.nama_lulusan || !r.nama_lulusan.trim() || !r.nim || !r.nim.trim()) {
        errors++
        continue
      }

      const cleanNim = r.nim.trim()
      // 2. Cek duplikasi NIM (onConflict ignore)
      if (existingNims.has(cleanNim)) {
        skipped++
        continue
      }

      existingNims.add(cleanNim)
      processed.push({
        ...r,
        nama_lulusan: r.nama_lulusan.trim(),
        nim: cleanNim,
      })
      imported++
    }

    return { imported, skipped, errors, processed }
  }

  it('NFR-007.1: Menangani batch data campuran (valid, duplikat, dan corrupt) tanpa system fail', () => {
    const existingDatabaseNims = new Set(['1910511001'])
    const batchInput: ImportRow[] = [
      { nama_lulusan: 'Budi Utomo', nim: '1910511001' }, // Sudah ada di DB -> Skipped
      { nama_lulusan: 'Siti Rahma', nim: '1910511002' }, // Valid baru -> Imported
      { nama_lulusan: '', nim: '1910511003' },           // Corrupt tanpa nama -> Error
      { nama_lulusan: 'Andi Pratama', nim: '   ' },      // Corrupt NIM whitespace -> Error
      { nama_lulusan: 'Dewi Lestari', nim: '1910511004' },// Valid baru -> Imported
    ]

    const result = processBatchImport(batchInput, existingDatabaseNims)
    expect(result.imported).toBe(2)
    expect(result.skipped).toBe(1)
    expect(result.errors).toBe(2)
    expect(result.processed.length).toBe(2)
  })

  it('NFR-007.2: Menangani payload kosong secara aman', () => {
    const existingDatabaseNims = new Set<string>()
    const result = processBatchImport([], existingDatabaseNims)
    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(0)
    expect(result.errors).toBe(0)
  })
})
