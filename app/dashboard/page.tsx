import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner'
import { calcProfileCompleteness, STATUS_LABELS } from '@/lib/database.types'
import type { CurrentStatus } from '@/lib/database.types'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Statistik ringkas
  const { count: totalAlumni } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'alumni')

  const { data: statusStats } = await supabase
    .from('profiles')
    .select('current_status')
    .eq('role', 'alumni')
    .not('current_status', 'is', null)

  const statusCount = statusStats?.reduce((acc, p) => {
    const s = p.current_status as string
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  const completeness = calcProfileCompleteness(profile)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Selamat datang, {profile.full_name?.split(' ')[0] || 'Alumni'} 👋
        </h1>
        <p className="text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Profile completion banner */}
      <ProfileCompletionBanner profile={profile} />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Alumni"
          value={String(totalAlumni ?? 0)}
          icon="👥"
          color="blue"
        />
        <StatCard
          label="Profil Saya"
          value={`${completeness}%`}
          icon="📋"
          color="amber"
          sublabel="Kelengkapan"
        />
        <StatCard
          label="Bekerja"
          value={String(statusCount['employed'] ?? 0)}
          icon="💼"
          color="emerald"
        />
        <StatCard
          label="Studi Lanjut"
          value={String(statusCount['studying'] ?? 0)}
          icon="🎓"
          color="purple"
        />
      </div>

      {/* Profil Ringkas */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 text-lg">Profil Saya</h2>
            <Link href="/dashboard/profile" className="text-blue-600 text-sm font-medium hover:underline">
              Edit →
            </Link>
          </div>
          <div className="space-y-3">
            <InfoRow icon="🎓" label="Program Studi" value={profile.major || '-'} />
            <InfoRow icon="🏫" label="Fakultas" value={profile.faculty || '-'} />
            <InfoRow icon="📅" label="Tahun Lulus" value={profile.graduation_year ? String(profile.graduation_year) : '-'} />
            <InfoRow icon="💼" label="Status" value={profile.current_status ? STATUS_LABELS[profile.current_status as CurrentStatus] : '-'} />
            <InfoRow icon="🏢" label="Perusahaan" value={profile.current_company || '-'} />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 text-lg">Distribusi Status Alumni</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(STATUS_LABELS).map(([key, label]) => {
              const count = statusCount[key] ?? 0
              const total = totalAlumni ?? 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold text-slate-700">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full">
                    <div
                      className="h-2 bg-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="card p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Temukan Alumni Lainnya</h3>
            <p className="text-blue-100 text-sm mt-0.5">
              Lihat dan terhubung dengan sesama alumni dari institusi anda
            </p>
          </div>
          <Link
            href="/alumni"
            className="bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-xl 
                       hover:bg-blue-50 transition-all flex-shrink-0"
          >
            Lihat Semua
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, sublabel }: {
  label: string; value: string; icon: string; color: string; sublabel?: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    amber: 'bg-amber-50 border-amber-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    purple: 'bg-purple-50 border-purple-100',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{sublabel || label}</p>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-400 block">{label}</span>
        <span className="text-sm font-medium text-slate-700 truncate block">{value}</span>
      </div>
    </div>
  )
}
