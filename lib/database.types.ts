export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'alumni'
export type CurrentStatus = 'employed' | 'self_employed' | 'studying' | 'unemployed' | 'other'
export type Gender = 'male' | 'female'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  nim: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  date_of_birth: string | null
  gender: Gender | null
  address: string | null
  city: string | null
  faculty: string | null
  major: string | null
  graduation_year: number | null
  gpa: number | null
  current_status: CurrentStatus | null
  current_job_title: string | null
  current_company: string | null
  work_field: string | null
  work_city: string | null
  linkedin_url: string | null
  github_url: string | null
  bio: string | null
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface CareerHistory {
  id: string
  profile_id: string
  job_title: string
  company: string
  start_year: number | null
  end_year: number | null
  is_current: boolean
  description: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
      }
      career_history: {
        Row: CareerHistory
        Insert: Omit<CareerHistory, 'id' | 'created_at'> & { id?: string }
        Update: Partial<CareerHistory>
      }
    }
    Views: {
      profile_completeness: {
        Row: {
          id: string
          full_name: string | null
          completeness_percent: number
          role: UserRole
          updated_at: string
        }
      }
    }
  }
}

// Helper: hitung completeness di sisi client
export function calcProfileCompleteness(profile: Partial<Profile>): number {
  const fields = [
    'full_name', 'nim', 'phone', 'avatar_url',
    'date_of_birth', 'faculty', 'major',
    'graduation_year', 'current_status', 'current_job_title'
  ]
  const filled = fields.filter(f => {
    const val = profile[f as keyof Profile]
    return val !== null && val !== undefined && val !== ''
  })
  return Math.round((filled.length / fields.length) * 100)
}

export const STATUS_LABELS: Record<CurrentStatus, string> = {
  employed: 'Bekerja',
  self_employed: 'Wirausaha',
  studying: 'Melanjutkan Studi',
  unemployed: 'Belum Bekerja',
  other: 'Lainnya',
}

export const FACULTY_OPTIONS = [
  'Fakultas Teknik',
  'Fakultas Ekonomi & Bisnis',
  'Fakultas Hukum',
  'Fakultas Ilmu Komputer',
  'Fakultas Kedokteran',
  'Fakultas MIPA',
  'Fakultas Ilmu Sosial',
  'Fakultas Pertanian',
  'Lainnya',
]
