import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/Navbar"
import { STATUS_LABELS } from "@/lib/database.types"
import type { CurrentStatus } from "@/lib/database.types"
import {
  StatusPieChart,
  YearBarChart,
  TrendLineChart,
  HBarChart,
  CompletenessGroupChart,
} from "@/components/AdminCharts"

export default async function AdminStatistikPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  if (myProfile?.role !== "admin") redirect("/dashboard")

  // ============ Ambil semua data ============
  const { data: allAlumni } = await supabase
    .from("profiles")
    .select(
      "current_status, graduation_year, faculty, major, work_field, work_city, gender, created_at, gpa, is_visible",
    )
    .eq("role", "alumni")

  const { data: completenessRaw } = await supabase
    .from("profile_completeness")
    .select("completeness_percent")
    .eq("role", "alumni")

  const { count: totalAlumni } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "alumni")

  const { count: totalVisible } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "alumni")
    .eq("is_visible", true)

  const { count: totalWithJob } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "alumni")
    .not("current_company", "is", null)

  // ============ Olah data ============
  const alumni = allAlumni || []
  const total = totalAlumni ?? 0

  // 1. Status
  const STATUS_COLORS: Record<string, string> = {
    employed: "#10b981",
    self_employed: "#f59e0b",
    studying: "#3b82f6",
    unemployed: "#94a3b8",
    other: "#a78bfa",
  }
  const statusCount = alumni.reduce(
    (acc, p) => {
      if (p.current_status)
        acc[p.current_status] = (acc[p.current_status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const statusData = Object.entries(STATUS_LABELS).map(([key, name]) => ({
    name,
    value: statusCount[key] ?? 0,
    color: STATUS_COLORS[key],
    pct: total > 0 ? Math.round(((statusCount[key] ?? 0) / total) * 100) : 0,
  }))

  // 2. Per angkatan (semua tahun)
  const yearCount = alumni.reduce(
    (acc, p) => {
      if (p.graduation_year)
        acc[p.graduation_year] = (acc[p.graduation_year] || 0) + 1
      return acc
    },
    {} as Record<number, number>,
  )
  const yearData = Object.entries(yearCount)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, jumlah]) => ({ year, jumlah }))

  // 3. Tren registrasi per tahun (dari created_at)
  const regCount = alumni.reduce(
    (acc, p) => {
      if (p.created_at) {
        const y = new Date(p.created_at).getFullYear()
        acc[y] = (acc[y] || 0) + 1
      }
      return acc
    },
    {} as Record<number, number>,
  )
  const regData = Object.entries(regCount)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, jumlah]) => ({ year, jumlah }))

  // 4. Per fakultas (semua)
  const facultyCount = alumni.reduce(
    (acc, p) => {
      if (p.faculty) acc[p.faculty] = (acc[p.faculty] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const facultyData = Object.entries(facultyCount)
    .sort(([, a], [, b]) => b - a)
    .map(([name, jumlah]) => ({
      name: name.replace("Fakultas ", "Fak. "),
      jumlah,
    }))

  // 5. Top 10 prodi
  const majorCount = alumni.reduce(
    (acc, p) => {
      if (p.major) acc[p.major] = (acc[p.major] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const majorData = Object.entries(majorCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, jumlah]) => ({ name, jumlah }))

  // 6. Top 10 bidang pekerjaan
  const workFieldCount = alumni.reduce(
    (acc, p) => {
      if (p.work_field) acc[p.work_field] = (acc[p.work_field] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const workFieldData = Object.entries(workFieldCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, jumlah]) => ({ name, jumlah }))

  // 7. Top 10 kota kerja
  const workCityCount = alumni.reduce(
    (acc, p) => {
      if (p.work_city) acc[p.work_city] = (acc[p.work_city] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const workCityData = Object.entries(workCityCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, jumlah]) => ({ name, jumlah }))

  // 8. Gender
  const genderCount = alumni.reduce(
    (acc, p) => {
      const g = p.gender || "unknown"
      acc[g] = (acc[g] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  const genderData = [
    {
      name: "Laki-laki",
      value: genderCount["male"] ?? 0,
      color: "#3b82f6",
      pct:
        total > 0 ? Math.round(((genderCount["male"] ?? 0) / total) * 100) : 0,
    },
    {
      name: "Perempuan",
      value: genderCount["female"] ?? 0,
      color: "#ec4899",
      pct:
        total > 0
          ? Math.round(((genderCount["female"] ?? 0) / total) * 100)
          : 0,
    },
    {
      name: "Tidak diisi",
      value: genderCount["unknown"] ?? 0,
      color: "#cbd5e1",
      pct:
        total > 0
          ? Math.round(((genderCount["unknown"] ?? 0) / total) * 100)
          : 0,
    },
  ]

  // 9. Kelengkapan profil
  const completenessGroups = { low: 0, mid: 0, high: 0, full: 0 }
  ;(completenessRaw || []).forEach(({ completeness_percent: pct }) => {
    if (pct < 30) completenessGroups.low++
    else if (pct < 60) completenessGroups.mid++
    else if (pct < 80) completenessGroups.high++
    else completenessGroups.full++
  })
  const avgCompleteness = completenessRaw?.length
    ? Math.round(
        completenessRaw.reduce((s, c) => s + (c.completeness_percent || 0), 0) /
          completenessRaw.length,
      )
    : 0
  const completenessData = [
    {
      range: "< 30%",
      jumlah: completenessGroups.low,
      color: "#ef4444",
      pct: total > 0 ? Math.round((completenessGroups.low / total) * 100) : 0,
    },
    {
      range: "30–59%",
      jumlah: completenessGroups.mid,
      color: "#f59e0b",
      pct: total > 0 ? Math.round((completenessGroups.mid / total) * 100) : 0,
    },
    {
      range: "60–79%",
      jumlah: completenessGroups.high,
      color: "#3b82f6",
      pct: total > 0 ? Math.round((completenessGroups.high / total) * 100) : 0,
    },
    {
      range: "≥ 80%",
      jumlah: completenessGroups.full,
      color: "#10b981",
      pct: total > 0 ? Math.round((completenessGroups.full / total) * 100) : 0,
    },
  ]

  // 10. Rata-rata IPK per angkatan
  const gpaByYear: Record<number, number[]> = {}
  alumni.forEach((p) => {
    if (p.graduation_year && p.gpa) {
      if (!gpaByYear[p.graduation_year]) gpaByYear[p.graduation_year] = []
      gpaByYear[p.graduation_year].push(Number(p.gpa))
    }
  })
  const gpaData = Object.entries(gpaByYear)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, gpas]) => ({
      year,
      jumlah:
        Math.round((gpas.reduce((s, g) => s + g, 0) / gpas.length) * 100) / 100,
    }))

  // Summary stats
  const employed = statusCount["employed"] ?? 0
  const employRate = total > 0 ? Math.round((employed / total) * 100) : 0
  const noStatusCount = alumni.filter((a) => !a.current_status).length
  const noStatusPct = total > 0 ? Math.round((noStatusCount / total) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={myProfile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header + Breadcrumb */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                <Link
                  href="/admin"
                  className="hover:text-slate-600 transition-colors"
                >
                  Panel Admin
                </Link>
                <span>›</span>
                <span className="text-slate-600 font-medium">Statistik</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800">
                📊 Statistik Alumni
              </h1>
              <p className="text-slate-500 mt-0.5 text-sm">
                Analisis lengkap data {total} alumni terdaftar
              </p>
            </div>
            <Link href="/admin" className="btn-secondary text-sm py-2 px-4">
              ← Kembali ke Panel Admin
            </Link>
          </div>

          {/* ============ KPI Cards ============ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total Alumni",
                value: total,
                sub: "terdaftar",
                color: "blue",
                icon: "👥",
              },
              {
                label: "Tingkat Bekerja",
                value: `${employRate}%`,
                sub: `${employed} alumni bekerja`,
                color: "emerald",
                icon: "💼",
              },
              {
                label: "Profil Publik",
                value: totalVisible ?? 0,
                sub: `dari ${total} alumni`,
                color: "indigo",
                icon: "👁️",
              },
              {
                label: "Rata-rata Kelengkapan",
                value: `${avgCompleteness}%`,
                sub: "profil diisi",
                color: "amber",
                icon: "📋",
              },
            ].map((kpi, i) => (
              <KPICard key={i} {...kpi} />
            ))}
          </div>

          {/* ============ Alert: data kurang ============ */}
          {noStatusPct > 30 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-amber-800">
                  Perhatian: {noStatusCount} alumni ({noStatusPct}%) belum
                  mengisi status
                </p>
                <p className="text-amber-700 text-sm mt-0.5">
                  Pertimbangkan untuk mengirim reminder atau admin mengisi data
                  secara manual.
                  <Link
                    href="/admin"
                    className="ml-1 underline hover:no-underline"
                  >
                    Kelola alumni →
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* ============ Baris 1: Status + Gender ============ */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <SectionTitle
                title="Status Alumni"
                sub="Distribusi status pekerjaan saat ini"
              />
              <StatusPieChart data={statusData} />
            </div>
            <div className="card p-6">
              <SectionTitle
                title="Distribusi Gender"
                sub="Perbandingan jenis kelamin alumni"
              />
              <StatusPieChart data={genderData} />
            </div>
          </div>

          {/* ============ Baris 2: Per Angkatan + Tren Registrasi ============ */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <SectionTitle
                title="Alumni per Angkatan"
                sub="Jumlah alumni berdasarkan tahun lulus"
              />
              <YearBarChart data={yearData} />
            </div>
            <div className="card p-6">
              <SectionTitle
                title="Tren Registrasi"
                sub="Alumni yang mendaftar per tahun"
              />
              <TrendLineChart data={regData} />
            </div>
          </div>

          {/* ============ Baris 3: Fakultas + Prodi ============ */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <SectionTitle
                title="Per Fakultas"
                sub="Distribusi alumni per fakultas"
              />
              <HBarChart data={facultyData} />
            </div>
            <div className="card p-6">
              <SectionTitle
                title="Top 10 Program Studi"
                sub="Prodi dengan alumni terbanyak"
              />
              <HBarChart data={majorData} />
            </div>
          </div>

          {/* ============ Baris 4: Bidang Kerja + Kota Kerja ============ */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <SectionTitle
                title="Top 10 Bidang Pekerjaan"
                sub="Industri tempat alumni bekerja"
              />
              <HBarChart data={workFieldData} />
            </div>
            <div className="card p-6">
              <SectionTitle
                title="Top 10 Kota Bekerja"
                sub="Sebaran lokasi kerja alumni"
              />
              <HBarChart data={workCityData} />
            </div>
          </div>

          {/* ============ Kelengkapan Profil ============ */}
          <div className="card p-6">
            <SectionTitle
              title="Kelengkapan Profil Alumni"
              sub={`Rata-rata ${avgCompleteness}% — ${completenessGroups.full} alumni (${completenessData[3].pct}%) sudah lengkap ≥ 80%`}
            />
            <CompletenessGroupChart data={completenessData} />
          </div>

          {/* ============ IPK per Angkatan ============ */}
          {gpaData.length > 0 && (
            <div className="card p-6">
              <SectionTitle
                title="Rata-rata IPK per Angkatan"
                sub="Berdasarkan alumni yang mengisi data IPK"
              />
              <TrendLineChart data={gpaData} />
            </div>
          )}

          {/* ============ Quick Summary Table ============ */}
          <div className="card p-6">
            <SectionTitle
              title="Ringkasan Status per Angkatan"
              sub="Breakdown status pekerjaan berdasarkan tahun lulus"
            />
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase">
                      Angkatan
                    </th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-slate-400 uppercase">
                      Total
                    </th>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <th
                        key={k}
                        className="text-center py-2 px-3 text-xs font-semibold text-slate-400 uppercase hidden sm:table-cell"
                      >
                        {v}
                      </th>
                    ))}
                    <th className="text-center py-2 px-3 text-xs font-semibold text-slate-400 uppercase">
                      Belum Isi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {yearData
                    .slice()
                    .reverse()
                    .slice(0, 10)
                    .map(({ year }) => {
                      const yearAlumni = alumni.filter(
                        (a) => String(a.graduation_year) === year,
                      )
                      const noStatus = yearAlumni.filter(
                        (a) => !a.current_status,
                      ).length
                      return (
                        <tr
                          key={year}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-700">
                            {year}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                            {yearAlumni.length}
                          </td>
                          {Object.keys(STATUS_LABELS).map((k) => (
                            <td
                              key={k}
                              className="py-2.5 px-3 text-center text-slate-600 hidden sm:table-cell"
                            >
                              {yearAlumni.filter((a) => a.current_status === k)
                                .length || "—"}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-center">
                            {noStatus > 0 ? (
                              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                                {noStatus}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
              {yearData.length > 10 && (
                <p className="text-xs text-slate-400 mt-3 text-center">
                  Menampilkan 10 angkatan terbaru
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ============ Helper Components ============
function KPICard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string
  value: string | number
  sub: string
  color: string
  icon: string
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    indigo: "bg-indigo-50 border-indigo-100 text-indigo-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-3xl font-bold mt-2">{value}</p>
      <p className="text-sm font-semibold mt-0.5">{label}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  )
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-slate-800">{title}</h2>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}
