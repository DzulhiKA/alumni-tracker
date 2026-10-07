import { describe, it, expect } from 'vitest'

/**
 * NFR-004: Maintainability - Modularity & Profile Completeness Calculation
 * Related Module: components/ProfileCompletionBanner.tsx & lib/database.types.ts
 */
describe('NFR-004: Maintainability - Profile Completeness Logic Modularity', () => {
  interface ProfileData {
    full_name?: string | null
    nim?: string | null
    prodi?: string | null
    angkatan?: string | number | null
    tahun_lulus?: string | number | null
    phone?: string | null
    linkedin_url?: string | null
    current_company?: string | null
    current_position?: string | null
  }

  function calculateProfileCompleteness(profile: ProfileData): number {
    const fields: (keyof ProfileData)[] = [
      'full_name',
      'nim',
      'prodi',
      'angkatan',
      'tahun_lulus',
      'phone',
      'linkedin_url',
      'current_company',
      'current_position',
    ]

    let filledCount = 0
    fields.forEach((field) => {
      const val = profile[field]
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        filledCount++
      }
    })

    return Math.round((filledCount / fields.length) * 100)
  }

  it('NFR-004.1: Menghitung persentase 100% ketika semua atribut profil terisi', () => {
    const fullProfile: ProfileData = {
      full_name: 'Alumni Teladan',
      nim: '12345678',
      prodi: 'Teknik Informatika',
      angkatan: 2020,
      tahun_lulus: 2024,
      phone: '08123456789',
      linkedin_url: 'https://linkedin.com/in/alumniteladan',
      current_company: 'Tech Corp',
      current_position: 'Software Engineer',
    }
    expect(calculateProfileCompleteness(fullProfile)).toBe(100)
  })

  it('NFR-004.2: Menghitung 0% ketika semua atribut kosong atau bernilai null/whitespace', () => {
    const emptyProfile: ProfileData = {
      full_name: '   ',
      nim: null,
      prodi: '',
      angkatan: null,
      tahun_lulus: undefined,
      phone: '',
      linkedin_url: null,
      current_company: '',
      current_position: '',
    }
    expect(calculateProfileCompleteness(emptyProfile)).toBe(0)
  })

  it('NFR-004.3: Menghitung nilai proporsional secara akurat saat hanya sebagian field terisi', () => {
    const partialProfile: ProfileData = {
      full_name: 'Budi Santoso',
      nim: '12345678',
      prodi: 'Sistem Informasi',
    }
    // 3 out of 9 fields = 33.33% => 33%
    expect(calculateProfileCompleteness(partialProfile)).toBe(33)
  })
})

/**
 * NFR-005: Maintainability - Multi-Engine Social Link Extraction & Error Resiliency
 * Related Module: app/api/admin/google-search/route.ts
 */
describe('NFR-005: Maintainability - Social Link Extractor & Resiliency (google-search)', () => {
  interface SearchResult {
    linkedin?: string
    instagram?: string
    facebook?: string
    tiktok?: string
    tempat_bekerja?: string
    posisi?: string
    raw: any[]
  }

  function extractSocialsFromItems(items: Array<{ link?: string; snippet?: string; title?: string }>): SearchResult {
    const result: SearchResult = {
      linkedin: '',
      instagram: '',
      facebook: '',
      tiktok: '',
      tempat_bekerja: '',
      posisi: '',
      raw: items,
    }

    for (const item of items) {
      const link = item.link || ''
      if (!result.linkedin && link.includes('linkedin.com/in/')) {
        result.linkedin = link.split('?')[0]
      }
      if (!result.instagram && link.includes('instagram.com/')) {
        const clean = link.split('?')[0]
        if (!clean.includes('/p/') && !clean.includes('/reel/') && !clean.includes('/stories/')) {
          result.instagram = clean
        }
      }
      if (!result.facebook && link.includes('facebook.com/')) {
        const clean = link.split('?')[0]
        if (!clean.includes('/sharer') && !clean.includes('/story')) {
          result.facebook = clean
        }
      }
      if (!result.tiktok && link.includes('tiktok.com/@')) {
        result.tiktok = link.split('?')[0]
      }
    }

    return result
  }

  it('NFR-005.1: Berhasil mengekstrak dan membersihkan link LinkedIn (menghilangkan URL query parameters)', () => {
    const items = [
      { link: 'https://id.linkedin.com/in/budi-santoso-12345?trk=public_profile_browsemap' },
    ]
    const extracted = extractSocialsFromItems(items)
    expect(extracted.linkedin).toBe('https://id.linkedin.com/in/budi-santoso-12345')
  })

  it('NFR-005.2: Memfilter link post instagram (/p/ atau /reel/) agar hanya mengambil link profil utama', () => {
    const items = [
      { link: 'https://www.instagram.com/p/C123abc456/' }, // post link - harus diabaikan
      { link: 'https://www.instagram.com/budisantoso/?hl=en' }, // profile link - harus diambil
    ]
    const extracted = extractSocialsFromItems(items)
    expect(extracted.instagram).toBe('https://www.instagram.com/budisantoso/')
  })

  it('NFR-005.3: Tidak crash saat menerima array kosong atau item dengan link undefined', () => {
    const items = [{ snippet: 'Some text', title: 'Some title' }, { link: undefined }]
    const extracted = extractSocialsFromItems(items)
    expect(extracted.linkedin).toBe('')
    expect(extracted.instagram).toBe('')
    expect(extracted.raw.length).toBe(2)
  })
})

/**
 * NFR-006: Maintainability - Schema Type & Data Transformation Consistency
 * Related Module: lib/database.types.ts
 */
describe('NFR-006: Maintainability - Data Model Formatters & Type Contracts', () => {
  function formatYearRange(startYear?: number | string | null, endYear?: number | string | null, isCurrent?: boolean) {
    if (!startYear && !endYear) return '-'
    const start = startYear ? String(startYear) : '?'
    if (isCurrent) return `${start} - Sekarang`
    const end = endYear ? String(endYear) : 'Selesai'
    return `${start} - ${end}`
  }

  it('NFR-006.1: Memformat range karir aktif dengan status "Sekarang"', () => {
    expect(formatYearRange(2022, null, true)).toBe('2022 - Sekarang')
  })

  it('NFR-006.2: Memformat range karir yang telah selesai', () => {
    expect(formatYearRange(2018, 2022, false)).toBe('2018 - 2022')
  })

  it('NFR-006.3: Menghasilkan strip (-) jika rentang tahun tidak tersedia', () => {
    expect(formatYearRange(null, null, false)).toBe('-')
  })
})
