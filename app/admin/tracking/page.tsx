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

  const page = Math.max(1, parseInt(params.page || "1") || 1)
  const offset = (page - 1) * PAGE_SIZE

  console.log("=== PAGINATION DEBUG ===")
  console.log("PAGE:", page, "OFFSET:", offset, "PAGE_SIZE:", PAGE_SIZE)

  let query = supabase
    .from("alumni_records")
    .select("*", { count: "exact" })
    .order("nama_lulusan", { ascending: true })
    .order("id", { ascending: true })

  if (params.q)
    query = query.or(`nama_lulusan.ilike.%${params.q}%,nim.ilike.%${params.q}%`)
  if (params.status) query = query.eq("search_status", params.status)
  if (params.fakultas) query = query.eq("fakultas", params.fakultas)
  if (params.prodi) query = query.eq("program_studi", params.prodi)
  if (params.tahun) query = query.eq("tahun_masuk", params.tahun)

  query = query.range(offset, offset + PAGE_SIZE - 1)

  const { data: records, count, error } = await query

  console.log("COUNT:", count, "RECORDS:", records?.length, "ERROR:", error)
  console.log("FIRST RECORD:", records?.[0]?.nama_lulusan)
  console.log("LAST RECORD:", records?.[records.length - 1]?.nama_lulusan)

  const { count: totalAll } = await supabase
    .from("alumni_records")
    .select("*", { count: "exact", head: true })
  const { count: totalFound } = await supabase
    .from("alumni_records")
    .select("*", { count: "exact", head: true })
    .eq("search_status", "found")
  const { count: totalPending } = await supabase
    .from("alumni_records")
    .select("*", { count: "exact", head: true })
    .eq("search_status", "pending")
  const { count: totalClaimed } = await supabase
    .from("alumni_records")
    .select("*", { count: "exact", head: true })
    .eq("is_claimed", true)

  const { data: fakultasRows } = await supabase
    .from("alumni_records")
    .select("fakultas")
    .not("fakultas", "is", null)
  const { data: prodiRows } = await supabase
    .from("alumni_records")
    .select("program_studi")
    .not("program_studi", "is", null)
  const { data: tahunRows } = await supabase
    .from("alumni_records")
    .select("tahun_masuk")
    .not("tahun_masuk", "is", null)

  const uniqueFakultas = [
    ...new Set(fakultasRows?.map((r) => r.fakultas).filter(Boolean)),
  ].sort() as string[]
  const uniqueProdi = [
    ...new Set(prodiRows?.map((r) => r.program_studi).filter(Boolean)),
  ].sort() as string[]
  const uniqueTahun = [
    ...new Set(tahunRows?.map((r) => r.tahun_masuk).filter(Boolean)),
  ].sort() as string[]

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={myProfile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                <Link href="/admin" className="hover:text-slate-600">
                  Panel Admin
                </Link>
                <span>›</span>
                <span className="text-slate-600 font-medium">
                  Tracking Alumni
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800">
                🔍 Tracking Data Alumni
              </h1>
              <p className="text-slate-500 mt-0.5 text-sm">
                Kelola dan lacak data sosial media alumni dari{" "}
                {(totalAll ?? 0).toLocaleString("id-ID")} data
              </p>
            </div>
            <Link
              href="/admin/import"
              className="btn-primary flex items-center gap-2 text-sm"
            >
              📥 Import Excel
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border bg-blue-50 border-blue-100 p-5">
              <span className="text-2xl">👥</span>
              <p className="text-2xl font-bold text-slate-800 mt-2">
                {(totalAll ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">Total Data Alumni</p>
            </div>
            <div className="rounded-2xl border bg-emerald-50 border-emerald-100 p-5">
              <span className="text-2xl">✅</span>
              <p className="text-2xl font-bold text-slate-800 mt-2">
                {(totalFound ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">Sosmed Ditemukan</p>
            </div>
            <div className="rounded-2xl border bg-amber-50 border-amber-100 p-5">
              <span className="text-2xl">⏳</span>
              <p className="text-2xl font-bold text-slate-800 mt-2">
                {(totalPending ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">Belum Dicari</p>
            </div>
            <div className="rounded-2xl border bg-indigo-50 border-indigo-100 p-5">
              <span className="text-2xl">🔐</span>
              <p className="text-2xl font-bold text-slate-800 mt-2">
                {(totalClaimed ?? 0).toLocaleString("id-ID")}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">Sudah Klaim Akun</p>
            </div>
          </div>

          {!process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENABLED && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="text-sm text-amber-800">
                <p className="font-semibold">
                  Google Search API belum dikonfigurasi
                </p>
                <p className="mt-0.5 text-amber-700">
                  Tambahkan{" "}
                  <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">
                    GOOGLE_API_KEY
                  </code>{" "}
                  dan{" "}
                  <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">
                    GOOGLE_SEARCH_ENGINE_ID
                  </code>{" "}
                  di Vercel untuk mengaktifkan pencarian otomatis.
                </p>
                <p className="text-amber-600 text-xs mt-1">
                  Data alumni tetap bisa dilihat dan diedit secara manual tanpa
                  Google Search API.
                </p>
              </div>
            </div>
          )}

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