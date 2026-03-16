import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { STATUS_LABELS } from "@/lib/database.types"
import type { Profile, CurrentStatus } from "@/lib/database.types"
import Navbar from "@/components/Navbar"
import FilterSelect from "@/components/FilterSelect"

// Paksa selalu render dinamis — tidak di-prerender saat build Vercel
export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: {
    q?: string
    faculty?: string
    year?: string
    status?: string
    work_city?: string
    work_field?: string
    sort?: string
    view?: string
  }
}

export default async function AlumniPage({ searchParams }: PageProps) {
  // Fallback ke object kosong jika undefined
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

  // Sort mapping
  const sortMap: Record<string, { col: string; asc: boolean }> = {
    name_asc: { col: "full_name", asc: true },
    name_desc: { col: "full_name", asc: false },
    year_desc: { col: "graduation_year", asc: false },
    year_asc: { col: "graduation_year", asc: true },
    updated: { col: "updated_at", asc: false },
  }
  const sortKey = params.sort || "year_desc"
  const { col: sortCol, asc: sortAsc } =
    sortMap[sortKey] ?? sortMap["year_desc"]

  // Build query
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "alumni")
    .eq("is_visible", true)
    .order(sortCol, { ascending: sortAsc })

  if (params.q) {
    query = query.or(
      `full_name.ilike.%${params.q}%,nim.ilike.%${params.q}%,` +
        `current_company.ilike.%${params.q}%,major.ilike.%${params.q}%,` +
        `current_job_title.ilike.%${params.q}%,work_field.ilike.%${params.q}%`,
    )
  }
  if (params.faculty) query = query.eq("faculty", params.faculty)
  if (params.year) query = query.eq("graduation_year", parseInt(params.year))
  if (params.status) query = query.eq("current_status", params.status)
  if (params.work_city)
    query = query.ilike("work_city", `%${params.work_city}%`)
  if (params.work_field)
    query = query.ilike("work_field", `%${params.work_field}%`)

  const { data: alumni } = await query

  // Ambil opsi filter
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("faculty, graduation_year, work_city, work_field")
    .eq("role", "alumni")
    .eq("is_visible", true)

  const uniqueFaculties = [
    ...new Set((allProfiles || []).map((p) => p.faculty).filter(Boolean)),
  ] as string[]
  const uniqueYears = [
    ...new Set(
      (allProfiles || []).map((p) => p.graduation_year).filter(Boolean),
    ),
  ].sort((a, b) => b - a) as number[]
  const uniqueCities = [
    ...new Set((allProfiles || []).map((p) => p.work_city).filter(Boolean)),
  ].sort() as string[]
  const uniqueFields = [
    ...new Set((allProfiles || []).map((p) => p.work_field).filter(Boolean)),
  ].sort() as string[]

  // Filter aktif
  const activeFilters = [
    params.q && { key: "q", label: `"${params.q}"` },
    params.faculty && { key: "faculty", label: params.faculty },
    params.year && { key: "year", label: `Angkatan ${params.year}` },
    params.status && {
      key: "status",
      label: STATUS_LABELS[params.status as CurrentStatus],
    },
    params.work_city && { key: "work_city", label: `📍 ${params.work_city}` },
    params.work_field && {
      key: "work_field",
      label: `🏭 ${params.work_field}`,
    },
  ].filter(Boolean) as { key: string; label: string }[]

  const hasFilters = activeFilters.length > 0
  const viewMode = params.view || "grid"

  // Helper: buat object hidden params untuk FilterSelect (exclude key tertentu)
  const buildHidden = (
    exclude: string,
    p: Record<string, string | undefined>,
  ) =>
    Object.fromEntries(
      Object.entries(p).filter(
        ([k, v]) => k !== exclude && v !== undefined && v !== "",
      ),
    ) as Record<string, string>

  // Helper buat URL dengan override param tertentu
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const merged = { ...params, ...overrides }
    const qs = Object.entries(merged)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&")
    return `/alumni${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={myProfile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Direktori Alumni
              </h1>
              <p className="text-slate-500 mt-0.5 text-sm">
                {hasFilters ? (
                  <>
                    <span className="font-semibold text-blue-600">
                      {alumni?.length ?? 0}
                    </span>{" "}
                    hasil dari filter yang diterapkan
                  </>
                ) : (
                  <>
                    <span className="font-semibold">{alumni?.length ?? 0}</span>{" "}
                    alumni terdaftar
                  </>
                )}
              </p>
            </div>

            {/* Toggle view grid/list */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              <Link
                href={buildUrl({ view: "grid" })}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
                title="Tampilan grid"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
                </svg>
              </Link>
              <Link
                href={buildUrl({ view: "list" })}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-slate-400 hover:text-slate-600"}`}
                title="Tampilan list"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Search & Filter Panel */}
          <div className="card p-5 space-y-4">
            <form method="GET" action="/alumni" className="space-y-3">
              {/* Search bar */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    🔍
                  </span>
                  <input
                    name="q"
                    defaultValue={params.q ?? ""}
                    placeholder="Cari nama, NIM, prodi, perusahaan, jabatan..."
                    className="input-field pl-9"
                  />
                </div>
                {/* Preserve filter params */}
                {params.faculty && (
                  <input type="hidden" name="faculty" value={params.faculty} />
                )}
                {params.year && (
                  <input type="hidden" name="year" value={params.year} />
                )}
                {params.status && (
                  <input type="hidden" name="status" value={params.status} />
                )}
                {params.work_city && (
                  <input
                    type="hidden"
                    name="work_city"
                    value={params.work_city}
                  />
                )}
                {params.work_field && (
                  <input
                    type="hidden"
                    name="work_field"
                    value={params.work_field}
                  />
                )}
                {params.sort && (
                  <input type="hidden" name="sort" value={params.sort} />
                )}
                {params.view && (
                  <input type="hidden" name="view" value={params.view} />
                )}
                <button
                  type="submit"
                  className="btn-primary px-6 flex-shrink-0"
                >
                  Cari
                </button>
              </div>

              {/* Filter dropdowns — masing-masing punya form sendiri agar auto-submit */}
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <FilterSelect
                name="faculty"
                value={params.faculty}
                label="Semua Fakultas"
                options={uniqueFaculties.map((f) => ({
                  value: f,
                  label: f.replace("Fakultas ", ""),
                }))}
                hiddenParams={buildHidden("faculty", params)}
              />
              <FilterSelect
                name="year"
                value={params.year}
                label="Semua Angkatan"
                options={uniqueYears.map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
                hiddenParams={buildHidden("year", params)}
              />
              <FilterSelect
                name="status"
                value={params.status}
                label="Semua Status"
                options={Object.entries(STATUS_LABELS).map(([k, v]) => ({
                  value: k,
                  label: v,
                }))}
                hiddenParams={buildHidden("status", params)}
              />
              <FilterSelect
                name="work_city"
                value={params.work_city}
                label="Semua Kota Kerja"
                options={uniqueCities.map((c) => ({ value: c, label: c }))}
                hiddenParams={buildHidden("work_city", params)}
              />
              <FilterSelect
                name="work_field"
                value={params.work_field}
                label="Semua Bidang"
                options={uniqueFields.map((f) => ({ value: f, label: f }))}
                hiddenParams={buildHidden("work_field", params)}
              />
              <FilterSelect
                name="sort"
                value={params.sort || "year_desc"}
                showDefault={false}
                label="Urutkan"
                options={[
                  { value: "year_desc", label: "📅 Angkatan Terbaru" },
                  { value: "year_asc", label: "📅 Angkatan Lama" },
                  { value: "name_asc", label: "🔤 Nama A–Z" },
                  { value: "name_desc", label: "🔤 Nama Z–A" },
                  { value: "updated", label: "🕐 Baru Diperbarui" },
                ]}
                hiddenParams={buildHidden("sort", params)}
              />
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                <span className="text-xs text-slate-400 font-medium">
                  Filter aktif:
                </span>
                {activeFilters.map((f) => (
                  <Link
                    key={f.key}
                    href={buildUrl({ [f.key]: undefined })}
                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-red-50 hover:text-red-600 transition-all group"
                  >
                    {f.label}
                    <span className="group-hover:text-red-500">✕</span>
                  </Link>
                ))}
                <Link
                  href="/alumni"
                  className="text-xs text-slate-400 hover:text-red-500 ml-1 transition-colors"
                >
                  Hapus semua
                </Link>
              </div>
            )}
          </div>

          {/* Results */}
          {!alumni || alumni.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-5xl mb-3">🔍</div>
              <p className="font-semibold text-slate-700">
                Tidak ada alumni ditemukan
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Coba ubah kata kunci atau filter pencarian
              </p>
              {hasFilters && (
                <Link
                  href="/alumni"
                  className="inline-block mt-4 text-sm text-blue-600 hover:underline"
                >
                  Hapus semua filter
                </Link>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {alumni.map((alum) => (
                <AlumniCard
                  key={alum.id}
                  alumni={alum}
                  isMe={alum.id === user.id}
                />
              ))}
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="divide-y divide-slate-50">
                {alumni.map((alum) => (
                  <AlumniListRow
                    key={alum.id}
                    alumni={alum}
                    isMe={alum.id === user.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ============ Grid Card ============
function AlumniCard({ alumni, isMe }: { alumni: Profile; isMe: boolean }) {
  const statusBadge: Record<string, string> = {
    employed: "badge-employed",
    studying: "badge-studying",
    self_employed: "badge-self_employed",
    unemployed: "badge-unemployed",
    other: "badge-other",
  }
  return (
    <Link
      href={`/alumni/${alumni.id}`}
      className={`card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all block ${isMe ? "ring-2 ring-blue-500" : ""}`}
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
            <span>🎓</span>
            {alumni.major}
          </p>
        )}
        {(alumni.current_job_title || alumni.current_company) && (
          <p className="text-sm text-slate-600 flex items-center gap-1.5">
            <span>💼</span>
            <span className="truncate">
              {[alumni.current_job_title, alumni.current_company]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </p>
        )}
        {alumni.work_city && (
          <p className="text-sm text-slate-600 flex items-center gap-1.5">
            <span>📍</span>
            {alumni.work_city}
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
    </Link>
  )
}

// ============ List Row ============
function AlumniListRow({ alumni, isMe }: { alumni: Profile; isMe: boolean }) {
  const statusBadge: Record<string, string> = {
    employed: "badge-employed",
    studying: "badge-studying",
    self_employed: "badge-self_employed",
    unemployed: "badge-unemployed",
    other: "badge-other",
  }
  return (
    <Link
      href={`/alumni/${alumni.id}`}
      className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors ${isMe ? "bg-blue-50/50" : ""}`}
    >
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
        {alumni.avatar_url ? (
          <img
            src={alumni.avatar_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{alumni.full_name?.charAt(0).toUpperCase() || "?"}</span>
        )}
      </div>
      <div className="w-48 flex-shrink-0 min-w-0">
        <p className="font-semibold text-slate-800 truncate text-sm">
          {alumni.full_name || (
            <span className="italic text-slate-400">Belum diisi</span>
          )}
          {isMe && (
            <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
              Saya
            </span>
          )}
        </p>
        <p className="text-xs text-slate-400">{alumni.nim || "-"}</p>
      </div>
      <div className="hidden sm:block w-44 flex-shrink-0 min-w-0">
        <p className="text-sm text-slate-600 truncate">{alumni.major || "-"}</p>
        <p className="text-xs text-slate-400">
          {alumni.graduation_year || "-"}
        </p>
      </div>
      <div className="flex-1 min-w-0 hidden md:block">
        <p className="text-sm text-slate-600 truncate">
          {[alumni.current_job_title, alumni.current_company]
            .filter(Boolean)
            .join(" · ") || "-"}
        </p>
        {alumni.work_city && (
          <p className="text-xs text-slate-400">📍 {alumni.work_city}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {alumni.current_status ? (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[alumni.current_status]}`}
          >
            {STATUS_LABELS[alumni.current_status as CurrentStatus]}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>
      <span className="text-slate-300 flex-shrink-0">›</span>
    </Link>
  )
}
