import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
import { redirect } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/Navbar"
import AdminTable from "./AdminTable"

export default async function AdminPage() {
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

  // Ambil semua alumni + statistik
  const { data: allAlumni } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "alumni")
    .order("created_at", { ascending: false })

  const { data: completenessData } = await supabase
    .from("profile_completeness")
    .select("*")
    .eq("role", "alumni")

  const completenessMap = Object.fromEntries(
    (completenessData || []).map((c) => [c.id, c.completeness_percent]),
  )

  // Stats
  const statusGroups = (allAlumni || []).reduce(
    (acc, a) => {
      const s = a.current_status || "unknown"
      acc[s] = (acc[s] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const avgCompleteness = completenessData?.length
    ? Math.round(
        completenessData.reduce(
          (s, c) => s + (c.completeness_percent || 0),
          0,
        ) / completenessData.length,
      )
    : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={myProfile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Panel Admin</h1>
              <p className="text-slate-500 mt-0.5">
                Kelola seluruh data alumni
              </p>
            </div>
            <a
              href="/admin/statistik"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
            >
              📊 Lihat Statistik Lengkap
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-3xl font-bold text-blue-700">
                {allAlumni?.length ?? 0}
              </p>
              <p className="text-slate-500 text-sm mt-1">Total Alumni</p>
            </div>
            <div className="card p-5">
              <p className="text-3xl font-bold text-emerald-600">
                {statusGroups["employed"] ?? 0}
              </p>
              <p className="text-slate-500 text-sm mt-1">Bekerja</p>
            </div>
            <div className="card p-5">
              <p className="text-3xl font-bold text-blue-600">
                {statusGroups["studying"] ?? 0}
              </p>
              <p className="text-slate-500 text-sm mt-1">Studi Lanjut</p>
            </div>
            <div className="card p-5">
              <p className="text-3xl font-bold text-amber-600">
                {avgCompleteness}%
              </p>
              <p className="text-slate-500 text-sm mt-1">
                Rata-rata Kelengkapan
              </p>
            </div>
          </div>

          {/* Admin Table (Client Component) */}
          <AdminTable
            alumni={allAlumni || []}
            completenessMap={completenessMap}
            currentAdminId={user.id}
          />
        </div>
      </main>
    </div>
  )
}
