"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { STATUS_LABELS } from "@/lib/database.types"
import AddAlumniModal from "@/components/AddAlumniModal"
import ExportCSVModal from "@/components/ExportCSVModal"
import EditAlumniModal from "@/components/EditAlumniModal"
import type { Profile, CurrentStatus } from "@/lib/database.types"

interface AdminTableProps {
  alumni: Profile[]
  completenessMap: Record<string, number>
  currentAdminId: string
}

export default function AdminTable({
  alumni,
  completenessMap,
  currentAdminId,
}: AdminTableProps) {
  const router = useRouter()
  const supabase = createClient()

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterFaculty, setFilterFaculty] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [togglingVisibility, setTogglingVisibility] = useState<string | null>(
    null,
  )

  const faculties = useMemo(() => {
    return Array.from(new Set(alumni.map((a) => a.faculty).filter(Boolean))).sort() as string[]
  }, [alumni])

  const years = useMemo(() => {
    return Array.from(new Set(alumni.map((a) => a.graduation_year).filter(Boolean))).sort(
      (a, b) => (b as number) - (a as number),
    ) as number[]
  }, [alumni])

  const filtered = useMemo(() => {
    return alumni.filter((a) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchesSearch =
          a.full_name?.toLowerCase().includes(q) ||
          a.nim?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q) ||
          a.major?.toLowerCase().includes(q) ||
          a.faculty?.toLowerCase().includes(q) ||
          a.current_company?.toLowerCase().includes(q)
        if (!matchesSearch) return false
      }

      if (filterStatus && a.current_status !== filterStatus) {
        return false
      }

      if (filterFaculty && a.faculty !== filterFaculty) {
        return false
      }

      if (filterYear && a.graduation_year !== parseInt(filterYear, 10)) {
        return false
      }

      return true
    })
  }, [alumni, search, filterStatus, filterFaculty, filterYear])

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      return
    }
    setDeleting(id)
    await supabase.auth.admin.deleteUser(id).catch(() => {})
    await supabase.from("profiles").delete().eq("id", id)
    setDeleting(null)
    setConfirmDelete(null)
    router.refresh()
  }

  const handleToggleVisibility = async (id: string, current: boolean) => {
    setTogglingVisibility(id)
    await supabase
      .from("profiles")
      .update({ is_visible: !current })
      .eq("id", id)
    setTogglingVisibility(null)
    router.refresh()
  }

  return (
    <div className="card overflow-hidden shadow-sm border border-slate-200/80 bg-white">
      {/* Header & Filter Controls */}
      <div className="p-5 border-b border-slate-100 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Daftar Akun Alumni</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan <span className="font-semibold text-blue-600">{filtered.length}</span> dari {alumni.length} alumni
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <ExportCSVModal alumni={filtered} />
            <AddAlumniModal />
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIM, email, prodi..."
              className="input-field pl-8 text-xs py-2 w-full bg-slate-50 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div>
            <select
              value={filterFaculty}
              onChange={(e) => setFilterFaculty(e.target.value)}
              className={`input-field text-xs py-2 w-full font-medium ${
                filterFaculty ? "border-blue-500 bg-blue-50 text-blue-800" : "bg-slate-50"
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

          <div>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className={`input-field text-xs py-2 w-full font-medium ${
                filterYear ? "border-blue-500 bg-blue-50 text-blue-800" : "bg-slate-50"
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

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`input-field text-xs py-2 w-full font-medium ${
                filterStatus ? "border-blue-500 bg-blue-50 text-blue-800" : "bg-slate-50"
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
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {[
                "Nama & NIM",
                "Prodi / Angkatan",
                "Status",
                "Kelengkapan",
                "Visible",
                "Aksi",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="font-semibold text-slate-600">Tidak ada data alumni</p>
                  <p className="text-xs mt-0.5">Coba sesuaikan kata kunci pencarian atau filter</p>
                </td>
              </tr>
            ) : (
              filtered.map((alum) => {
                const pct = completenessMap[alum.id] ?? 0
                return (
                  <tr
                    key={alum.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                          {alum.full_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {alum.full_name || (
                              <span className="italic text-slate-400">
                                Belum diisi
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">
                            {alum.nim || "-"} · {alum.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p className="font-medium text-slate-800">{alum.major || "-"}</p>
                      <p className="text-xs text-slate-400">
                        {alum.faculty || "-"} · {alum.graduation_year || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {alum.current_status ? (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full badge-${alum.current_status}`}
                        >
                          {STATUS_LABELS[alum.current_status as CurrentStatus]}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full max-w-16">
                          <div
                            className={`h-1.5 rounded-full ${
                              pct >= 80
                                ? "bg-emerald-500"
                                : pct >= 50
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-8">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          handleToggleVisibility(alum.id, alum.is_visible)
                        }
                        disabled={togglingVisibility === alum.id}
                        className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                          alum.is_visible ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={alum.is_visible ? "Profil tampil ke publik" : "Profil disembunyikan"}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
                            alum.is_visible ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <EditAlumniModal alumni={alum} />
                        <button
                          onClick={() => handleDelete(alum.id)}
                          disabled={deleting === alum.id}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                            confirmDelete === alum.id
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : "text-red-500 hover:bg-red-50"
                          }`}
                        >
                          {deleting === alum.id
                            ? "..."
                            : confirmDelete === alum.id
                              ? "Konfirmasi"
                              : "Hapus"}
                        </button>
                        {confirmDelete === alum.id && (
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs font-medium px-2 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 ml-1"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
