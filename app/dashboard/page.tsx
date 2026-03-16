import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import ProfileCompletionBanner from "@/components/ProfileCompletionBanner"
import DashboardCharts from "@/components/DashboardCharts"
import { calcProfileCompleteness, STATUS_LABELS } from "@/lib/database.types"
import type { CurrentStatus } from "@/lib/database.types"

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/auth/login")

  // Ambil semua data alumni untuk statistik
  const { data: allAlumni } = await supabase
    .from("profiles")
    .select("current_status, graduation_year, faculty, work_field")
    .eq("role", "alumni")

  const { count: totalAlumni } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "alumni")

  // Ambil data kelengkapan profil
  const { data: completenessData } = await supabase
    .from("profile_completeness")
    .select("completeness_percent")
    .eq("role", "alumni")

  // =============================================
  // Olah data untuk chart
  // =============================================

  // 1. Status distribution
  const statusCount = (allAlumni || []).reduce(
    (acc, p) => {
      if (p.current_status)
        acc[p.current_status] = (acc[p.current_status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const STATUS_COLORS: Record<string, string> = {
    employed: "#10b981",
    self_employed: "#f59e0b",
    studying: "#3b82f6",
    unemployed: "#94a3b8",
    other: "#a78bfa",
  }

  const statusData = Object.entries(STATUS_LABELS).map(([key, name]) => ({
    name,
    value: statusCount[key] ?? 0,
    color: STATUS_COLORS[key],
  }))

  // 2. Per angkatan (tahun lulus) — ambil 8 tahun terakhir
  const yearCount = (allAlumni || []).reduce(
    (acc, p) => {
      if (p.graduation_year)
        acc[p.graduation_year] = (acc[p.graduation_year] || 0) + 1
      return acc
    },
    {} as Record<number, number>,
  )

  const yearData = Object.entries(yearCount)
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(-8)
    .map(([year, jumlah]) => ({ year: String(year), jumlah }))

  // 3. Per fakultas — top 5
  const facultyCount = (allAlumni || []).reduce(
    (acc, p) => {
      if (p.faculty) acc[p.faculty] = (acc[p.faculty] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const facultyData = Object.entries(facultyCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, jumlah]) => ({
      // Singkat nama fakultas agar muat di chart
      name: name.replace("Fakultas ", "Fak. "),
      jumlah,
    }))

  // 4. Bidang pekerjaan — top 5
  const workFieldCount = (allAlumni || []).reduce(
    (acc, p) => {
      if (p.work_field) acc[p.work_field] = (acc[p.work_field] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const workFieldData = Object.entries(workFieldCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, jumlah]) => ({ name, jumlah }))

  // 5. Distribusi kelengkapan profil
  const completenessGroups = { low: 0, mid: 0, high: 0, full: 0 }
  ;(completenessData || []).forEach(({ completeness_percent: pct }) => {
    if (pct < 30) completenessGroups.low++
    else if (pct < 60) completenessGroups.mid++
    else if (pct < 80) completenessGroups.high++
    else completenessGroups.full++
  })

  const profileCompletenessData = [
    { range: "< 30%", jumlah: completenessGroups.low, color: "#ef4444" },
    { range: "30–59%", jumlah: completenessGroups.mid, color: "#f59e0b" },
    { range: "60–79%", jumlah: completenessGroups.high, color: "#3b82f6" },
    { range: "≥ 80%", jumlah: completenessGroups.full, color: "#10b981" },
  ]

  const completeness = calcProfileCompleteness(profile)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Selamat datang, {profile.full_name?.split(" ")[0] || "Alumni"} 👋
        </h1>
        <p className="text-slate-500 mt-0.5">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
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
          label="Kelengkapan Profil"
          value={`${completeness}%`}
          icon="📋"
          color="amber"
        />
        <StatCard
          label="Bekerja"
          value={String(statusCount["employed"] ?? 0)}
          icon="💼"
          color="emerald"
        />
        <StatCard
          label="Studi Lanjut"
          value={String(statusCount["studying"] ?? 0)}
          icon="🎓"
          color="purple"
        />
      </div>

      {/* Profil Ringkas */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 text-lg">Profil Saya</h2>
            <Link
              href="/dashboard/profile"
              className="text-blue-600 text-sm font-medium hover:underline"
            >
              Edit →
            </Link>
          </div>
          <div className="space-y-3">
            <InfoRow
              icon="🎓"
              label="Program Studi"
              value={profile.major || "-"}
            />
            <InfoRow
              icon="🏫"
              label="Fakultas"
              value={profile.faculty || "-"}
            />
            <InfoRow
              icon="📅"
              label="Tahun Lulus"
              value={
                profile.graduation_year ? String(profile.graduation_year) : "-"
              }
            />
            <InfoRow
              icon="💼"
              label="Status"
              value={
                profile.current_status
                  ? STATUS_LABELS[profile.current_status as CurrentStatus]
                  : "-"
              }
            />
            <InfoRow
              icon="🏢"
              label="Perusahaan"
              value={profile.current_company || "-"}
            />
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-4">
          <div className="card p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-1">
            <h3 className="font-bold text-lg">Temukan Alumni Lainnya</h3>
            <p className="text-blue-100 text-sm mt-1 mb-4">
              Lihat dan terhubung dengan sesama alumni dari institusi Anda
            </p>
            <Link
              href="/alumni"
              className="inline-block bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all"
            >
              Lihat Direktori →
            </Link>
          </div>
          <div className="card p-6 flex-1">
            <h3 className="font-bold text-slate-800">Wirausaha</h3>
            <p className="text-3xl font-bold text-amber-500 mt-1">
              {statusCount["self_employed"] ?? 0}
            </p>
            <p className="text-slate-400 text-sm mt-0.5">alumni berwirausaha</p>
          </div>
        </div>
      </div>

      {/* ===== CHARTS ===== */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          📊 Statistik Alumni
        </h2>
        <DashboardCharts
          statusData={statusData}
          yearData={yearData}
          facultyData={facultyData}
          workFieldData={workFieldData}
          completenessData={profileCompletenessData}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: string
  color: string
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100",
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    purple: "bg-purple-50 border-purple-100",
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-400 block">{label}</span>
        <span className="text-sm font-medium text-slate-700 truncate block">
          {value}
        </span>
      </div>
    </div>
  )
}
