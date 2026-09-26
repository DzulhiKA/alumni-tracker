import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/Navbar"
import TrackingTable from "./TrackingTable"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
  searchParams: {
    q?: string
    status?: string
    fakultas?: string
    prodi?: string
    tahun?: string
    page?: string
  }
}

const PAGE_SIZE = 50

export default async function TrackingPage({ searchParams }: PageProps) {
  const params = searchParams ?? {}
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

  const page = Math.max(1, parseInt(params.page || "1", 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  // Build query data alumni_records
  let query = supabase
    .from("alumni_records")
    .select("*", { count: "exact" })

  // Search filter aman
  if (params.q && params.q.trim()) {
    const qClean = params.q.trim()
    query = query.or(`nama_lulusan.ilike.%${qClean}%,nim.ilike.%${qClean}%,tempat_bekerja.ilike.%${qClean}%`)
  }

  // Filter status pencarian & verifikasi
  if (params.status) {
    if (params.status === "claimed") {
      query = query.eq("is_claimed", true)
    } else if (params.status === "verified") {
      query = query.eq("is_verified", true)
    } else {
      query = query.eq("search_status", params.status)
    }
  }

  if (params.fakultas) query = query.eq("fakultas", params.fakultas)
  if (params.prodi) query = query.eq("program_studi", params.prodi)
  if (params.tahun) query = query.eq("tahun_masuk", params.tahun)

  query = query
    .order("nama_lulusan", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  const { data: records, count } = await query

  // Query stats ringkas (jalankan paralel agar cepat)
  const [
    { count: totalAll },
    { count: totalFound },
    { count: totalPending },
    { count: totalClaimed },
  ] = await Promise.all([
    supabase.from("alumni_records").select("*", { count: "exact", head: true }),
    supabase.from("alumni_records").select("*", { count: "exact", head: true }).eq("search_status", "found"),
    supabase.from("alumni_records").select("*", { count: "exact", head: true }).eq("search_status", "pending"),
    supabase.from("alumni_records").select("*", { count: "exact", head: true }).eq("is_claimed", true),
  ])

  // Ambil metadata opsi filter dari alumni_records
  const { data: filterOptionsData } = await supabase
    .from("alumni_records")
    .select("fakultas, program_studi, tahun_masuk")
    .limit(1000)

  const uniqueFakultas = Array.from(
    new Set((filterOptionsData || []).map((r: any) => r.fakultas).filter(Boolean)),
  ).sort() as string[]

  const uniqueProdi = Array.from(
    new Set((filterOptionsData || []).map((r: any) => r.program_studi).filter(Boolean)),
  ).sort() as string[]

  const uniqueTahun = Array.from(
    new Set((filterOptionsData || []).map((r: any) => r.tahun_masuk).filter(Boolean)),
  ).sort((a: any, b: any) => Number(b) - Number(a)) as string[]

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={myProfile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                <Link href="/admin" className="hover:text-slate-600 transition-colors">
                  Panel Admin
                </Link>
                <span>›</span>
                <span className="text-slate-700 font-semibold">
                  Tracking Data Alumni
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800">
                🔍 Tracking & Penelusuran Alumni
              </h1>
              <p className="text-slate-500 mt-0.5 text-sm">
                Kelola dan telusuri jejak karir, kontak, dan sosial media dari total{" "}
                <span className="font-semibold text-slate-700">{(totalAll ?? 0).toLocaleString("id-ID")}</span> data alumni di database
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/import"
                className="btn-secondary flex items-center gap-2 text-sm shadow-sm"
              >
                📥 Import Excel
              </Link>
            </div>
          </div>

          {/* Stat Cards Ringkas & Cepat */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border bg-white border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Data</span>
                <span className="text-xl">👥</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-2">
                {(totalAll ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-slate-400 mt-1">Data lulusan terdaftar</p>
            </div>

            <div className="rounded-2xl border bg-emerald-50/50 border-emerald-200/70 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Sosmed / Karir Ditemukan</span>
                <span className="text-xl">✅</span>
              </div>
              <p className="text-2xl font-bold text-emerald-800 mt-2">
                {(totalFound ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-emerald-600 mt-1">Data terlacak</p>
            </div>

            <div className="rounded-2xl border bg-amber-50/50 border-amber-200/70 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Belum Dilacak</span>
                <span className="text-xl">⏳</span>
              </div>
              <p className="text-2xl font-bold text-amber-800 mt-2">
                {(totalPending ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-amber-600 mt-1">Perlu pembaruan data</p>
            </div>

            <div className="rounded-2xl border bg-blue-50/50 border-blue-200/70 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Akun Aktif</span>
                <span className="text-xl">🔐</span>
              </div>
              <p className="text-2xl font-bold text-blue-800 mt-2">
                {(totalClaimed ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-blue-600 mt-1">Sudah klaim akun</p>
            </div>
          </div>

          {/* Tabel Tracking Berperforma Tinggi */}
          <TrackingTable
            records={records || []}
            total={count || 0}
            page={page}
            totalPages={totalPages}
            params={params}
            uniqueFakultas={uniqueFakultas}
            uniqueProdi={uniqueProdi}
            uniqueTahun={uniqueTahun}
          />
        </div>
      </main>
    </div>
  )
}