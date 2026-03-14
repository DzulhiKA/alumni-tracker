import Link from 'next/link'
import { calcProfileCompleteness } from '@/lib/database.types'
import type { Profile } from '@/lib/database.types'

interface ProfileBannerProps {
  profile: Profile
}

export default function ProfileCompletionBanner({ profile }: ProfileBannerProps) {
  const percent = calcProfileCompleteness(profile)

  if (percent >= 80) return null // Sudah cukup lengkap, jangan tampilkan

  const missing: string[] = []
  if (!profile.full_name) missing.push('nama lengkap')
  if (!profile.nim) missing.push('NIM')
  if (!profile.phone) missing.push('no. telepon')
  if (!profile.faculty) missing.push('fakultas')
  if (!profile.major) missing.push('program studi')
  if (!profile.graduation_year) missing.push('tahun lulus')
  if (!profile.current_status) missing.push('status pekerjaan')
  if (!profile.current_job_title) missing.push('jabatan')

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-amber-800">Profil Anda Belum Lengkap</p>
        <p className="text-sm text-amber-700 mt-0.5">
          Lengkapi profil agar dapat ditemukan oleh sesama alumni dan institusi.
        </p>
        {missing.length > 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Belum diisi: {missing.slice(0, 4).join(', ')}{missing.length > 4 ? `, dan ${missing.length - 4} lainnya` : ''}
          </p>
        )}
        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 bg-amber-200 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm font-bold text-amber-700 flex-shrink-0">{percent}%</span>
        </div>
      </div>
      <Link
        href="/dashboard/profile"
        className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm 
                   font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
      >
        Lengkapi
      </Link>
    </div>
  )
}
