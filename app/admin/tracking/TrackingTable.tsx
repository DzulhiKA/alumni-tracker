"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface AlumniRecord {
  id: string
  nama_lulusan: string
  nim: string | null
  tahun_masuk: string | null
  tanggal_lulus: string | null
  fakultas: string | null
  program_studi: string | null
  email: string | null
  no_hp: string | null
  linkedin_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  tempat_bekerja: string | null
  alamat_bekerja: string | null
  posisi: string | null
  tipe_pekerjaan: string | null
  company_website: string | null
  company_instagram: string | null
  company_linkedin: string | null
  search_status: string
  last_searched_at: string | null
  is_claimed: boolean
  is_verified: boolean
}

interface Props {
  records: AlumniRecord[]
  total: number
  page: number
  totalPages: number
  params: Record<string, string | undefined>
  uniqueFakultas: string[]
  uniqueProdi: string[]
  uniqueTahun: string[]
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  found: "bg-emerald-100 text-emerald-700",
  not_found: "bg-rose-100 text-rose-600",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ Belum Dilacak",
  found: "✅ Ditemukan",
  not_found: "❌ Belum Ditemukan",
}

const TIPE_LABEL: Record<string, string> = {
  pns: "PNS / ASN",
  swasta: "Swasta",
  wirausaha: "Wirausaha",
  other: "Lainnya",
}

export default function TrackingTable({
  records,
  total,
  page,
  totalPages,
  params,
  uniqueFakultas,
  uniqueProdi,
  uniqueTahun,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [localRecords, setLocalRecords] = useState<AlumniRecord[]>(records)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<AlumniRecord>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Local filter states for smooth instant feedback
  const [searchVal, setSearchVal] = useState(params.q ?? "")
  const [statusVal, setStatusVal] = useState(params.status ?? "")
  const [fakultasVal, setFakultasVal] = useState(params.fakultas ?? "")
  const [prodiVal, setProdiVal] = useState(params.prodi ?? "")
  const [tahunVal, setTahunVal] = useState(params.tahun ?? "")

  useEffect(() => {
    setLocalRecords(records)
  }, [records])

  useEffect(() => {
    setSearchVal(params.q ?? "")
    setStatusVal(params.status ?? "")
    setFakultasVal(params.fakultas ?? "")
    setProdiVal(params.prodi ?? "")
    setTahunVal(params.tahun ?? "")
  }, [params])

  // Tampilkan notifikasi singkat
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  // Trigger navigasi filter cepat tanpa reload browser
  const applyFilter = (overrides: Record<string, string | undefined>) => {
    const nextParams = {
      q: searchVal,
      status: statusVal,
      fakultas: fakultasVal,
      prodi: prodiVal,
      tahun: tahunVal,
      page: "1", // reset ke halaman 1 saat filter berubah
      ...overrides,
    }

    const qs = Object.entries(nextParams)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&")

    const url = `/admin/tracking${qs ? `?${qs}` : ""}`
    startTransition(() => {
      router.push(url)
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilter({ q: searchVal })
  }

  const buildPageUrl = (targetPage: number) => {
    const merged = { ...params, page: String(targetPage) }
    const qs = Object.entries(merged)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&")
    return `/admin/tracking${qs ? `?${qs}` : ""}`
  }

  // Edit manual alumni record
  const startEdit = (record: AlumniRecord) => {
    setEditingId(record.id)
    setEditForm({ ...record })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingId(editingId)

    try {
      const res = await fetch("/api/admin/update-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, data: editForm }),
      })

      const d = await res.json()

      if (res.ok) {
        setLocalRecords((prev) =>
          prev.map((r) =>
            r.id === editingId ? ({ ...r, ...editForm } as AlumniRecord) : r,
          ),
        )
        setEditingId(null)
        setEditForm({})
        showToast("Data tracking alumni berhasil diperbarui!")
      } else {
        alert(`Gagal menyimpan: ${d.error || "Terjadi kesalahan"}`)
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan jaringan: ${err.message}`)
    } finally {
      setSavingId(null)
    }
  }

  // Quick toggle status penelusuran (found/pending)
  const quickToggleStatus = async (record: AlumniRecord) => {
    const nextStatus = record.search_status === "found" ? "pending" : "found"
    setLocalRecords((prev) =>
      prev.map((r) =>
        r.id === record.id ? { ...r, search_status: nextStatus } : r,
      ),
    )

    try {
      await fetch("/api/admin/update-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          data: { search_status: nextStatus },
        }),
      })
      showToast(
        `Status ${record.nama_lulusan} diubah ke ${
          nextStatus === "found" ? "Ditemukan" : "Belum Dilacak"
        }`,
      )
    } catch {
      // rollback jika gagal
      setLocalRecords((prev) =>
        prev.map((r) =>
          r.id === record.id ? { ...r, search_status: record.search_status } : r,
        ),
      )
    }
  }

  // Quick toggle status verifikasi
  const quickToggleVerified = async (record: AlumniRecord) => {
    const nextVerified = !record.is_verified
    setLocalRecords((prev) =>
      prev.map((r) =>
        r.id === record.id ? { ...r, is_verified: nextVerified } : r,
      ),
    )

    try {
      await fetch("/api/admin/update-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          data: { is_verified: nextVerified },
        }),
      })
      showToast(
        `Data ${record.nama_lulusan} ${
          nextVerified ? "ditandai terverifikasi ✓" : "batal verifikasi"
        }`,
      )
    } catch {
      // rollback
      setLocalRecords((prev) =>
        prev.map((r) =>
          r.id === record.id ? { ...r, is_verified: record.is_verified } : r,
        ),
      )
    }
  }

  const activeFilters = [
    params.q && {
      key: "q",
      label: `"${params.q}"`,
      clear: () => {
        setSearchVal("")
        applyFilter({ q: "" })
      },
    },
    params.status && {
      key: "status",
      label: `Status: ${STATUS_LABEL[params.status] || params.status}`,
      clear: () => {
        setStatusVal("")
        applyFilter({ status: "" })
      },
    },
    params.fakultas && {
      key: "fakultas",
      label: `Fakultas: ${params.fakultas}`,
      clear: () => {
        setFakultasVal("")
        applyFilter({ fakultas: "" })
      },
    },
    params.prodi && {
      key: "prodi",
      label: `Prodi: ${params.prodi}`,
      clear: () => {
        setProdiVal("")
        applyFilter({ prodi: "" })
      },
    },
    params.tahun && {
      key: "tahun",
      label: `Angkatan ${params.tahun}`,
      clear: () => {
        setTahunVal("")
        applyFilter({ tahun: "" })
      },
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[]

  const clearAllFilters = () => {
    setSearchVal("")
    setStatusVal("")
    setFakultasVal("")
    setProdiVal("")
    setTahunVal("")
    startTransition(() => {
      router.push("/admin/tracking")
    })
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm animate-fade-in border border-slate-700">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter & Search Panel Responsif */}
      <div className="card p-5 space-y-3.5 shadow-sm border border-slate-200/80 bg-white">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Cari berdasarkan nama lulusan, NIM, atau tempat kerja..."
              className="input-field pl-9 pr-8 text-sm w-full py-2.5 bg-slate-50 focus:bg-white"
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => {
                  setSearchVal("")
                  applyFilter({ q: "" })
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary px-6 text-sm flex-shrink-0 font-medium py-2.5 shadow-sm"
          >
            {isPending ? "Memuat..." : "Cari Data"}
          </button>
        </form>

        {/* Dropdown Filters (Instant Change) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Fakultas */}
          <div>
            <select
              value={fakultasVal}
              onChange={(e) => {
                const val = e.target.value
                setFakultasVal(val)
                applyFilter({ fakultas: val })
              }}
              className={`input-field text-xs py-2 w-full font-medium ${
                fakultasVal ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "bg-slate-50"
              }`}
            >
              <option value="">Semua Fakultas</option>
              {uniqueFakultas.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Program Studi */}
          <div>
            <select
              value={prodiVal}
              onChange={(e) => {
                const val = e.target.value
                setProdiVal(val)
                applyFilter({ prodi: val })
              }}
              className={`input-field text-xs py-2 w-full font-medium ${
                prodiVal ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "bg-slate-50"
              }`}
            >
              <option value="">Semua Prodi</option>
              {uniqueProdi.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Angkatan / Tahun Masuk */}
          <div>
            <select
              value={tahunVal}
              onChange={(e) => {
                const val = e.target.value
                setTahunVal(val)
                applyFilter({ tahun: val })
              }}
              className={`input-field text-xs py-2 w-full font-medium ${
                tahunVal ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "bg-slate-50"
              }`}
            >
              <option value="">Semua Angkatan</option>
              {uniqueTahun.map((t) => (
                <option key={t} value={t}>
                  Angkatan {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Penelusuran */}
          <div>
            <select
              value={statusVal}
              onChange={(e) => {
                const val = e.target.value
                setStatusVal(val)
                applyFilter({ status: val })
              }}
              className={`input-field text-xs py-2 w-full font-medium ${
                statusVal ? "border-blue-500 bg-blue-50 text-blue-800 font-semibold" : "bg-slate-50"
              }`}
            >
              <option value="">Semua Status</option>
              <option value="pending">⏳ Belum Dilacak</option>
              <option value="found">✅ Sosmed/Karir Ditemukan</option>
              <option value="not_found">❌ Belum Ditemukan</option>
              <option value="claimed">🔐 Sudah Klaim Akun</option>
              <option value="verified">✓ Terverifikasi</option>
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
              Reset semua
            </button>
          </div>
        )}
      </div>

      {/* Toolbar Info */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-1">
        <p className="text-sm text-slate-600">
          Ditemukan <span className="font-bold text-slate-900">{total.toLocaleString("id-ID")}</span> data
          {" · "}Halaman <span className="font-semibold text-slate-800">{page}</span> dari {totalPages}
        </p>
        {isPending && (
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 animate-pulse">
            <span>Memperbarui data...</span>
          </div>
        )}
      </div>

      {/* Tabel Data Alumni Tracking */}
      <div className="card overflow-hidden shadow-sm border border-slate-200/80 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                {[
                  "Nama & NIM",
                  "Fakultas & Prodi",
                  "Kontak & Media Sosial",
                  "Pekerjaan & Instansi",
                  "Status Tracking",
                  "Aksi",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {localRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="font-bold text-slate-700 text-base">Tidak ada data alumni tracking</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci atau filter di atas</p>
                    {activeFilters.length > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="mt-3 inline-block text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                localRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Nama & NIM */}
                    <td className="px-4 py-3.5 min-w-48 align-top">
                      <p className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                        {record.nama_lulusan}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        {record.nim || "-"}
                      </p>
                      <div className="flex gap-1.5 flex-wrap mt-1.5">
                        {record.is_claimed && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                            🔐 Akun Aktif
                          </span>
                        )}
                        {record.is_verified && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                            ✓ Terverifikasi
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Prodi & Fakultas */}
                    <td className="px-4 py-3.5 min-w-44 align-top">
                      <p className="text-sm font-medium text-slate-800">
                        {record.program_studi || "-"}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {record.fakultas || "-"}
                      </p>
                      {record.tahun_masuk && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Angkatan {record.tahun_masuk}
                        </p>
                      )}
                    </td>

                    {/* Kontak & Media Sosial */}
                    <td className="px-4 py-3.5 min-w-48 align-top">
                      {record.email && (
                        <p className="text-xs text-slate-600 truncate max-w-48 mb-1 flex items-center gap-1.5">
                          <span>✉️</span>
                          <span className="truncate">{record.email}</span>
                        </p>
                      )}
                      {record.no_hp && (
                        <p className="text-xs text-slate-600 mb-1 flex items-center gap-1.5 font-mono">
                          <span>📱</span>
                          <span>{record.no_hp}</span>
                        </p>
                      )}
                      <div className="flex gap-1.5 flex-wrap mt-1.5">
                        {record.linkedin_url && (
                          <a
                            href={record.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded-md font-semibold transition-all"
                            title="LinkedIn"
                          >
                            LinkedIn ↗
                          </a>
                        )}
                        {record.instagram_url && (
                          <a
                            href={record.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-pink-100 hover:bg-pink-200 text-pink-700 px-2 py-0.5 rounded-md font-semibold transition-all"
                            title="Instagram"
                          >
                            IG ↗
                          </a>
                        )}
                        {record.facebook_url && (
                          <a
                            href={record.facebook_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md font-semibold transition-all"
                            title="Facebook"
                          >
                            FB ↗
                          </a>
                        )}
                        {record.tiktok_url && (
                          <a
                            href={record.tiktok_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-semibold transition-all"
                            title="TikTok"
                          >
                            TikTok ↗
                          </a>
                        )}
                        {!record.linkedin_url &&
                          !record.instagram_url &&
                          !record.facebook_url &&
                          !record.tiktok_url &&
                          !record.email &&
                          !record.no_hp && (
                            <span className="text-xs text-slate-300 italic">
                              Belum ada data kontak
                            </span>
                          )}
                      </div>
                    </td>

                    {/* Pekerjaan */}
                    <td className="px-4 py-3.5 min-w-44 align-top">
                      {record.tempat_bekerja ? (
                        <>
                          <p className="text-sm font-semibold text-slate-800 truncate max-w-48">
                            {record.tempat_bekerja}
                          </p>
                          {record.posisi && (
                            <p className="text-xs text-slate-600 mt-0.5">
                              {record.posisi}
                            </p>
                          )}
                          {record.tipe_pekerjaan && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                                record.tipe_pekerjaan === "pns"
                                  ? "bg-blue-100 text-blue-700"
                                  : record.tipe_pekerjaan === "swasta"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {TIPE_LABEL[record.tipe_pekerjaan] || record.tipe_pekerjaan}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-300 italic">
                          Belum terdata
                        </span>
                      )}
                    </td>

                    {/* Status Tracking */}
                    <td className="px-4 py-3.5 align-top">
                      <button
                        type="button"
                        onClick={() => quickToggleStatus(record)}
                        title="Klik untuk ubah status secara cepat"
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-transform hover:scale-105 ${
                          STATUS_BADGE[record.search_status] || "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {STATUS_LABEL[record.search_status] || record.search_status}
                      </button>
                      {record.last_searched_at && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          {new Date(record.last_searched_at).toLocaleDateString("id-ID")}
                        </p>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => startEdit(record)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all border border-blue-200 text-left flex items-center gap-1.5"
                        >
                          <span>✏️</span>
                          <span>Edit Data</span>
                        </button>
                        <button
                          onClick={() => quickToggleVerified(record)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all border text-left flex items-center gap-1.5 ${
                            record.is_verified
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-slate-500 hover:bg-slate-100 border-slate-200"
                          }`}
                        >
                          <span>{record.is_verified ? "✓" : "○"}</span>
                          <span>{record.is_verified ? "Terverifikasi" : "Verifikasi"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Ringan & Cepat */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-3">
            <p className="text-xs font-medium text-slate-500">
              Halaman <span className="font-bold text-slate-700">{page}</span> dari {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="btn-secondary text-xs py-1.5 px-3.5 font-medium shadow-sm"
                >
                  ← Sebelumnya
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="btn-primary text-xs py-1.5 px-4 font-medium shadow-sm"
                >
                  Selanjutnya →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Edit Tracking Alumni */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setEditingId(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">Edit Data Tracking Alumni</h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  {editForm.nama_lulusan} {editForm.nim ? `(${editForm.nim})` : ""}
                </p>
              </div>
              <button
                onClick={() => setEditingId(null)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-base"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Kontak */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Informasi Kontak
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Email</label>
                    <input
                      className="input-field text-sm"
                      value={editForm.email || ""}
                      placeholder="alumni@email.com"
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-xs">No. Telepon / WhatsApp</label>
                    <input
                      className="input-field text-sm"
                      value={editForm.no_hp || ""}
                      placeholder="08xxxxxxxxxx"
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, no_hp: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Media Sosial */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Sosial Media Alumni
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">LinkedIn URL</label>
                    <input
                      className="input-field text-sm"
                      value={editForm.linkedin_url || ""}
                      placeholder="https://linkedin.com/in/..."
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          linkedin_url: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Instagram URL</label>
                    <input
                      className="input-field text-sm"
                      value={editForm.instagram_url || ""}
                      placeholder="https://instagram.com/..."
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          instagram_url: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Facebook URL</label>
                    <input
                      className="input-field text-sm"
                      value={editForm.facebook_url || ""}
                      placeholder="https://facebook.com/..."
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          facebook_url: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-xs">TikTok URL</label>
                    <input
                      className="input-field text-sm"
                      value={editForm.tiktok_url || ""}
                      placeholder="https://tiktok.com/@..."
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          tiktok_url: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Pekerjaan & Tempat Bekerja */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Data Karir & Pekerjaan
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Tempat Bekerja / Perusahaan</label>
                      <input
                        className="input-field text-sm"
                        value={editForm.tempat_bekerja || ""}
                        placeholder="Nama perusahaan/kantor/instansi"
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            tempat_bekerja: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Posisi / Jabatan</label>
                      <input
                        className="input-field text-sm"
                        value={editForm.posisi || ""}
                        placeholder="Staff, Manager, Engineer, dll"
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, posisi: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Kota / Alamat Bekerja</label>
                      <input
                        className="input-field text-sm"
                        value={editForm.alamat_bekerja || ""}
                        placeholder="Kota kantor (misal: Jakarta)"
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            alamat_bekerja: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Tipe Pekerjaan</label>
                      <select
                        className="input-field text-sm"
                        value={editForm.tipe_pekerjaan || ""}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            tipe_pekerjaan: e.target.value,
                          }))
                        }
                      >
                        <option value="">Pilih tipe pekerjaan</option>
                        <option value="pns">PNS / ASN</option>
                        <option value="swasta">Swasta</option>
                        <option value="wirausaha">Wirausaha</option>
                        <option value="other">Lainnya</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Lacak & Verifikasi */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Status Data
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Status Pelacakan</label>
                    <select
                      className="input-field text-sm"
                      value={editForm.search_status || "pending"}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          search_status: e.target.value,
                        }))
                      }
                    >
                      <option value="pending">⏳ Belum Dilacak</option>
                      <option value="found">✅ Ditemukan</option>
                      <option value="not_found">❌ Belum Ditemukan</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="modal_is_verified"
                      checked={editForm.is_verified || false}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          is_verified: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="modal_is_verified"
                      className="text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Tandai data ini terverifikasi
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl sticky bottom-0">
              <button
                onClick={() => setEditingId(null)}
                className="btn-secondary text-xs py-2 px-4 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={saveEdit}
                disabled={!!savingId}
                className="btn-primary text-xs py-2 px-5 font-semibold shadow-sm"
              >
                {savingId ? "Menyimpan..." : "Simpan Pembaruan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
