"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { STATUS_LABELS } from "@/lib/database.types"
import type { Profile, CurrentStatus } from "@/lib/database.types"

interface AlumniDirectoryClientProps {
  initialAlumni: Profile[]
  currentUserId: string
  faculties: string[]
  years: number[]
  cities: string[]
  fields: string[]
}

export default function AlumniDirectoryClient({
  initialAlumni,
  currentUserId,
  faculties,
  years,
  cities,
  fields,
}: AlumniDirectoryClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // State filter
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [faculty, setFaculty] = useState(searchParams.get("faculty") || "")
  const [year, setYear] = useState(searchParams.get("year") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [workCity, setWorkCity] = useState(searchParams.get("work_city") || "")
  const [workField, setWorkField] = useState(searchParams.get("work_field") || "")
  const [sort, setSort] = useState(searchParams.get("sort") || "year_desc")
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    (searchParams.get("view") as "grid" | "list") || "grid",
  )

  // Update URL search params secara mulus tanpa reload halaman
  const updateUrl = (overrides: Record<string, string | undefined>) => {
    const current = {
      q: searchQuery,
      faculty,
      year,
      status,
      work_city: workCity,
      work_field: workField,
      sort,
      view: viewMode,
      ...overrides,
    }

    const params = new URLSearchParams()
    Object.entries(current).forEach(([k, v]) => {
      if (v && v !== "" && !(k === "sort" && v === "year_desc") && !(k === "view" && v === "grid")) {
        params.set(k, v)
      }
    })

    const qs = params.toString()
    const url = `/alumni${qs ? `?${qs}` : ""}`
    startTransition(() => {
      window.history.replaceState(null, "", url)
    })
  }

  // Filter & Sort instan di sisi client
  const filteredAlumni = useMemo(() => {
    let result = [...initialAlumni]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((a) => {
        return (
          a.full_name?.toLowerCase().includes(q) ||
          a.nim?.toLowerCase().includes(q) ||
          a.major?.toLowerCase().includes(q) ||
          a.faculty?.toLowerCase().includes(q) ||
          a.current_company?.toLowerCase().includes(q) ||
          a.current_job_title?.toLowerCase().includes(q) ||
          a.work_field?.toLowerCase().includes(q) ||
          a.work_city?.toLowerCase().includes(q) ||
          a.city?.toLowerCase().includes(q)
        )
      })
    }

    if (faculty) {
      result = result.filter((a) => a.faculty === faculty)
    }

    if (year) {
      const yNum = parseInt(year, 10)
      result = result.filter((a) => a.graduation_year === yNum)
    }

    if (status) {
      result = result.filter((a) => a.current_status === status)
    }

    if (workCity) {
      const c = workCity.toLowerCase()
      result = result.filter((a) => a.work_city?.toLowerCase().includes(c))
    }

    if (workField) {
      const f = workField.toLowerCase()
      result = result.filter((a) => a.work_field?.toLowerCase().includes(f))
    }

    // Sorting
    result.sort((a, b) => {
      if (sort === "name_asc") {
        return (a.full_name || "").localeCompare(b.full_name || "")
      }
      if (sort === "name_desc") {
        return (b.full_name || "").localeCompare(a.full_name || "")
      }
      if (sort === "year_asc") {
        return (a.graduation_year || 0) - (b.graduation_year || 0)
      }
      if (sort === "updated") {
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
      }
      // default: year_desc
      return (b.graduation_year || 0) - (a.graduation_year || 0)
    })

    return result
  }, [initialAlumni, searchQuery, faculty, year, status, workCity, workField, sort])

  // Filter aktif
  const activeFilters = [
    searchQuery && {
      key: "q",
      label: `"${searchQuery}"`,
      clear: () => {
        setSearchQuery("")
        updateUrl({ q: "" })
      },
    },
    faculty && {
      key: "faculty",
      label: faculty,
      clear: () => {
        setFaculty("")
        updateUrl({ faculty: "" })
      },
    },
    year && {
      key: "year",
      label: `Angkatan ${year}`,
      clear: () => {
        setYear("")
        updateUrl({ year: "" })
      },
    },
    status && {
      key: "status",
      label: STATUS_LABELS[status as CurrentStatus] || status,
      clear: () => {
        setStatus("")
        updateUrl({ status: "" })
      },
    },
    workCity && {
      key: "work_city",
      label: `📍 ${workCity}`,
      clear: () => {
        setWorkCity("")
        updateUrl({ work_city: "" })
      },
    },
    workField && {
      key: "work_field",
      label: `🏭 ${workField}`,
      clear: () => {
        setWorkField("")
        updateUrl({ work_field: "" })
      },
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[]

  const clearAllFilters = () => {
    setSearchQuery("")
    setFaculty("")
    setYear("")
    setStatus("")
    setWorkCity("")
    setWorkField("")
    setSort("year_desc")
    const url = `/alumni${viewMode === "list" ? "?view=list" : ""}`
    window.history.replaceState(null, "", url)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Direktori & Tracking Alumni
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            {activeFilters.length > 0 ? (
              <>
                Menampilkan <span className="font-semibold text-blue-600">{filteredAlumni.length}</span> dari {initialAlumni.length} alumni
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">{initialAlumni.length}</span> alumni terdaftar dalam sistem
              </>
            )}
          </p>
        </div>

        {/* Toggle view grid/list */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200/60 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setViewMode("grid")
              updateUrl({ view: "grid" })
            }}
            className={`p-2 rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-white shadow text-blue-600 font-medium"
                : "text-slate-500 hover:text-slate-700"
            }`}
            title="Tampilan Grid"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("list")
              updateUrl({ view: "list" })
            }}
            className={`p-2 rounded-lg transition-all ${
              viewMode === "list"
                ? "bg-white shadow text-blue-600 font-medium"
                : "text-slate-500 hover:text-slate-700"
            }`}
            title="Tampilan List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
              <path
                fillRule="evenodd"
                d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter & Search Panel */}
      <div className="card p-5 space-y-4 shadow-sm border border-slate-200/80 bg-white">
        {/* Search Bar Instan */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
            🔍
          </span>
          <input
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value
              setSearchQuery(val)
              updateUrl({ q: val })
            }}
            placeholder="Ketik nama alumni, NIM, prodi, perusahaan, posisi jabatan, kota kerja..."
            className="input-field pl-10 pr-10 text-sm font-medium py-2.5 w-full bg-slate-50 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("")
                updateUrl({ q: "" })
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full text-xs"
              title="Hapus teks pencarian"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdowns Instan (Tanpa Reload) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Fakultas */}
          <div>
            <select
              value={faculty}
              onChange={(e) => {
                const val = e.target.value
                setFaculty(val)
                updateUrl({ faculty: val })
              }}
              className={`input-field text-xs py-2 w-full font-medium ${
                faculty ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "bg-slate-50"
              }`}
            >
              <option value="">Semua Fakultas</option>
              {faculties.map((f) => (
                <option key={f} value={f}>
                  {f.replace("Fakultas ", "")}
                </option>
              ))}
            </select>
          </div>

          {/* Angkatan */}
          <div>
            <select
              value={year}
              onChange={(e) => {
                const val = e.target.value
                setYear(val)
                updateUrl({ year: val })
              }}
              className={`input-field text-xs py-2 w-full font-medium ${
                year ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "bg-slate-50"
              }`}
            >
              <option value="">Semua Angkatan</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  Angkatan {y}
                </option>
              ))}
            </select>
          </div>

          {/* Status Pekerjaan */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                const val = e.target.value
                setStatus(val)
                updateUrl({ status: val })
              }}
              className={`input-field text-xs py-2 w-full font-medium ${
                status ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "bg-slate-50"
              }`}
            >
              <option value="">Semua Status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Kota Kerja */}
          <div>
            <select
              value={workCity}
              onChange={(e) => {
                const val = e.target.value
                setWorkCity(val)
                updateUrl({ work_city: val })
              }}
              className={`input-field text-xs py-2 w-full font-medium ${
                workCity ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "bg-slate-50"
              }`}
            >
              <option value="">Semua Kota Kerja</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  📍 {c}
                </option>
              ))}
            </select>
          </div>

          {/* Bidang Kerja */}
          <div>
            <select
              value={workField}
              onChange={(e) => {
                const val = e.target.value
                setWorkField(val)
                updateUrl({ work_field: val })
              }}
              className={`input-field text-xs py-2 w-full font-medium ${
                workField ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "bg-slate-50"
              }`}
            >
              <option value="">Semua Bidang</option>
              {fields.map((f) => (
                <option key={f} value={f}>
                  🏭 {f}
                </option>
              ))}
            </select>
          </div>

          {/* Pengurutan */}
          <div>
            <select
              value={sort}
              onChange={(e) => {
                const val = e.target.value
                setSort(val)
                updateUrl({ sort: val })
              }}
              className="input-field text-xs py-2 w-full font-medium bg-slate-50 text-slate-700"
            >
              <option value="year_desc">📅 Angkatan Terbaru</option>
              <option value="year_asc">📅 Angkatan Lama</option>
              <option value="name_asc">🔤 Nama A–Z</option>
              <option value="name_desc">🔤 Nama Z–A</option>
              <option value="updated">🕐 Baru Diperbarui</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400 font-medium">Filter aktif:</span>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={f.clear}
                className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-red-50 hover:text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full transition-all group border border-blue-200/50"
              >
                <span>{f.label}</span>
                <span className="text-blue-400 group-hover:text-red-500 text-[11px]">✕</span>
              </button>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-slate-400 hover:text-red-600 ml-1 transition-colors underline font-medium"
            >
              Reset semua filter
            </button>
          </div>
        )}
      </div>

      {/* Hasil Alumni */}
      {filteredAlumni.length === 0 ? (
        <div className="card p-16 text-center shadow-sm">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-bold text-slate-800 text-lg">Tidak ada alumni ditemukan</p>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Tidak ada data alumni yang cocok dengan kriteria pencarian atau filter yang Anda pilih.
          </p>
          {activeFilters.length > 0 && (
            <button
              onClick={clearAllFilters}
              className="inline-block mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              Hapus semua filter
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlumni.map((alum) => (
            <AlumniCard key={alum.id} alumni={alum} isMe={alum.id === currentUserId} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden shadow-sm border border-slate-200/80">
          <div className="divide-y divide-slate-100">
            {filteredAlumni.map((alum) => (
              <AlumniListRow key={alum.id} alumni={alum} isMe={alum.id === currentUserId} />
            ))}
          </div>
        </div>
      )}
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
      className={`card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all block group relative ${
        isMe ? "ring-2 ring-blue-500 bg-blue-50/20" : ""
      }`}
    >
      {isMe && (
        <span className="absolute top-3 right-3 text-[11px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
          Profil Anda
        </span>
      )}

      <div className="flex items-start gap-3.5">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
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
        <div className="flex-1 min-w-0 pr-14">
          <h3 className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors text-base">
            {alumni.full_name || <span className="text-slate-400 italic">Belum diisi</span>}
          </h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {alumni.nim ? <span className="font-medium">{alumni.nim}</span> : "-"}
            {alumni.graduation_year && <span> · Lulus {alumni.graduation_year}</span>}
          </p>
        </div>
      </div>

      <div className="mt-3.5 space-y-1.5 text-sm text-slate-600 border-t border-slate-100 pt-3">
        {alumni.major && (
          <p className="flex items-center gap-2 truncate">
            <span>🎓</span>
            <span className="truncate">{alumni.major}</span>
          </p>
        )}
        {(alumni.current_job_title || alumni.current_company) && (
          <p className="flex items-center gap-2 font-medium text-slate-700 truncate">
            <span>💼</span>
            <span className="truncate">
              {[alumni.current_job_title, alumni.current_company].filter(Boolean).join(" · ")}
            </span>
          </p>
        )}
        {alumni.work_city && (
          <p className="flex items-center gap-2 text-xs text-slate-500 truncate">
            <span>📍</span>
            <span className="truncate">{alumni.work_city}</span>
          </p>
        )}
      </div>

      {alumni.current_status && (
        <div className="mt-3 pt-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              statusBadge[alumni.current_status] || "bg-slate-100 text-slate-600"
            }`}
          >
            {STATUS_LABELS[alumni.current_status as CurrentStatus] || alumni.current_status}
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
      className={`flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50/40 transition-colors ${
        isMe ? "bg-blue-50/40" : ""
      }`}
    >
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
        {alumni.avatar_url ? (
          <img src={alumni.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{alumni.full_name?.charAt(0).toUpperCase() || "?"}</span>
        )}
      </div>

      <div className="w-48 flex-shrink-0 min-w-0">
        <p className="font-semibold text-slate-800 truncate text-sm">
          {alumni.full_name || <span className="italic text-slate-400">Belum diisi</span>}
          {isMe && (
            <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">
              Anda
            </span>
          )}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{alumni.nim || "-"}</p>
      </div>

      <div className="hidden sm:block w-44 flex-shrink-0 min-w-0">
        <p className="text-sm text-slate-600 truncate">{alumni.major || "-"}</p>
        <p className="text-xs text-slate-400">{alumni.graduation_year ? `Lulus ${alumni.graduation_year}` : "-"}</p>
      </div>

      <div className="flex-1 min-w-0 hidden md:block">
        <p className="text-sm text-slate-700 font-medium truncate">
          {[alumni.current_job_title, alumni.current_company].filter(Boolean).join(" · ") || "-"}
        </p>
        {alumni.work_city && <p className="text-xs text-slate-400 mt-0.5">📍 {alumni.work_city}</p>}
      </div>

      <div className="flex-shrink-0">
        {alumni.current_status ? (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              statusBadge[alumni.current_status] || "bg-slate-100 text-slate-600"
            }`}
          >
            {STATUS_LABELS[alumni.current_status as CurrentStatus] || alumni.current_status}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>

      <span className="text-slate-300 flex-shrink-0 text-sm">›</span>
    </Link>
  )
}
