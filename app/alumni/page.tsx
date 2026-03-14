import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { STATUS_LABELS } from "@/lib/database.types"
import type { Profile, CurrentStatus } from "@/lib/database.types"
import Navbar from "@/components/Navbar"

interface PageProps {
  searchParams: Promise<{
    q?: string
    faculty?: string
    year?: string
    status?: string
  }>
}

export default async function AlumniPage({ searchParams }: PageProps) {
  const params = await searchParams
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

  // Build query
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "alumni")
    .eq("is_visible", true)
    .order("graduation_year", { ascending: false })

  if (params.q) {
    query = query.or(
      `full_name.ilike.%${params.q}%,nim.ilike.%${params.q}%,current_company.ilike.%${params.q}%,major.ilike.%${params.q}%`,
    )
  }
  if (params.faculty) query = query.eq("faculty", params.faculty)
  if (params.year) query = query.eq("graduation_year", parseInt(params.year))
  if (params.status) query = query.eq("current_status", params.status)

  const { data: alumni } = await query

  // Unique faculties for filter
  const { data: faculties } = await supabase
    .from("profiles")
    .select("faculty")
    .eq("role", "alumni")
    .not("faculty", "is", null)

  const uniqueFaculties = [
    ...new Set(faculties?.map((f) => f.faculty).filter(Boolean)),
  ]

  // Years
  const { data: years } = await supabase
    .from("profiles")
    .select("graduation_year")
    .eq("role", "alumni")
    .not("graduation_year", "is", null)
    .order("graduation_year", { ascending: false })
  const uniqueYears = [
    ...new Set(years?.map((y) => y.graduation_year).filter(Boolean)),
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={myProfile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Direktori Alumni
              </h1>
              <p className="text-slate-500 mt-0.5">
                {alumni?.length ?? 0} alumni ditemukan
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="card p-5">
            <form className="space-y-4">
              <div className="flex gap-3">
                <input
                  name="q"
                  defaultValue={params.q}
                  placeholder="Cari nama, NIM, perusahaan, atau prodi..."
                  className="input-field flex-1"
                />
                <button
                  type="submit"
                  className="btn-primary px-6 flex-shrink-0"
                >
                  Cari
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  name="faculty"
                  defaultValue={params.faculty}
                  className="input-field"
                >
                  <option value="">Semua Fakultas</option>
                  {uniqueFaculties.map((f) => (
                    <option key={f} value={f!}>
                      {f}
                    </option>
                  ))}
                </select>
                <select
                  name="year"
                  defaultValue={params.year}
                  className="input-field"
                >
                  <option value="">Semua Angkatan</option>
                  {uniqueYears.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={params.status}
                  className="input-field"
                >
                  <option value="">Semua Status</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {(params.q || params.faculty || params.year || params.status) && (
                <Link
                  href="/alumni"
                  className="text-sm text-blue-600 hover:underline"
                >
                  ✕ Hapus semua filter
                </Link>
              )}
            </form>
          </div>

          {/* Alumni Grid */}
          {!alumni || alumni.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-5xl mb-3">🔍</div>
              <p className="font-semibold text-slate-700">
                Tidak ada alumni ditemukan
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Coba ubah kata kunci atau filter pencarian
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {alumni.map((alum) => (
                <AlumniCard
                  key={alum.id}
                  alumni={alum}
                  isMe={alum.id === user.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function AlumniCard({ alumni, isMe }: { alumni: Profile; isMe: boolean }) {
  const statusBadge: Record<string, string> = {
    employed: "badge-employed",
    studying: "badge-studying",
    self_employed: "badge-self_employed",
    unemployed: "badge-unemployed",
    other: "badge-other",
  }

  return (
    <div
      className={`card p-5 hover:shadow-md transition-shadow ${isMe ? "ring-2 ring-blue-500" : ""}`}
    >
      {isMe && (
        <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full mb-3 inline-block">
          Profil Saya
        </span>
      )}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {alumni.avatar_url ? (
            <img
              src={alumni.avatar_url}
              alt={alumni.full_name || ""}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{alumni.full_name?.charAt(0).toUpperCase() || "?"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 truncate">
            {alumni.full_name || (
              <span className="text-slate-400 italic">Belum diisi</span>
            )}
          </h3>
          <p className="text-xs text-slate-500 truncate">
            {alumni.nim || "-"} · {alumni.graduation_year || "-"}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {alumni.major && (
          <p className="text-sm text-slate-600 flex items-center gap-1.5">
            <span className="text-slate-400">🎓</span> {alumni.major}
          </p>
        )}
        {(alumni.current_job_title || alumni.current_company) && (
          <p className="text-sm text-slate-600 flex items-center gap-1.5">
            <span className="text-slate-400">💼</span>
            <span className="truncate">
              {[alumni.current_job_title, alumni.current_company]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </p>
        )}
        {alumni.work_city && (
          <p className="text-sm text-slate-600 flex items-center gap-1.5">
            <span className="text-slate-400">📍</span> {alumni.work_city}
          </p>
        )}
      </div>

      {alumni.current_status && (
        <div className="mt-3">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[alumni.current_status] || "bg-slate-100 text-slate-600"}`}
          >
            {STATUS_LABELS[alumni.current_status as CurrentStatus]}
          </span>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {alumni.linkedin_url && (
          <a
            href={alumni.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            LinkedIn →
          </a>
        )}
        {alumni.github_url && (
          <a
            href={alumni.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-600 hover:text-slate-800 font-medium"
          >
            GitHub →
          </a>
        )}
        {isMe && (
          <Link
            href="/dashboard/profile"
            className="text-xs text-blue-600 hover:underline ml-auto"
          >
            Edit profil
          </Link>
        )}
      </div>
    </div>
  )
}
