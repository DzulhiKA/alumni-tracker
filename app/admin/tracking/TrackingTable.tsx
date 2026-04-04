"use client"

import { useState } from "react"
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
  pending: "bg-slate-100 text-slate-500",
  searching: "bg-blue-100 text-blue-600",
  found: "bg-emerald-100 text-emerald-700",
  not_found: "bg-red-100 text-red-500",
}
const STATUS_LABEL: Record<string, string> = {
  pending: "Belum dicari",
  searching: "Mencari...",
  found: "Ditemukan",
  not_found: "Tidak ditemukan",
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
  const [searching, setSearching] = useState<string | null>(null)
  const [searchingAll, setSearchingAll] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)
  const [localRecords, setLocalRecords] = useState<AlumniRecord[]>(records)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<AlumniRecord>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const merged = { ...params, ...overrides }
    const qs = Object.entries(merged)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&")
    return `/admin/tracking${qs ? `?${qs}` : ""}`
  }

  // Trigger Google Search untuk 1 alumni
  const triggerSearch = async (record: AlumniRecord) => {
    setSearching(record.id)
    setLocalRecords((prev) =>
      prev.map((r) =>
        r.id === record.id ? { ...r, search_status: "searching" } : r,
      ),
    )

    try {
      const res = await fetch("/api/admin/google-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: record.id,
          nama: record.nama_lulusan,
          nim: record.nim,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setLocalRecords((prev) =>
          prev.map((r) =>
            r.id === record.id
              ? {
                  ...r,
                  search_status: data.found ? "found" : "not_found",
                  linkedin_url: data.linkedin || r.linkedin_url,
                  instagram_url: data.instagram || r.instagram_url,
                  facebook_url: data.facebook || r.facebook_url,
                  tiktok_url: data.tiktok || r.tiktok_url,
                  last_searched_at: new Date().toISOString(),
                }
              : r,
          ),
        )
      } else {
        setLocalRecords((prev) =>
          prev.map((r) =>
            r.id === record.id ? { ...r, search_status: "pending" } : r,
          ),
        )
        alert(`Error: ${data.error}`)
      }
    } catch {
      setLocalRecords((prev) =>
        prev.map((r) =>
          r.id === record.id ? { ...r, search_status: "pending" } : r,
        ),
      )
    }
    setSearching(null)
  }

  // Cari semua pending di halaman ini
  const triggerSearchAll = async () => {
    const pending = localRecords.filter((r) => r.search_status === "pending")
    if (!pending.length) return
    setSearchingAll(true)

    for (let i = 0; i < pending.length; i++) {
      await triggerSearch(pending[i])
      setSearchProgress(Math.round(((i + 1) / pending.length) * 100))
      await new Promise((r) => setTimeout(r, 2000)) // 2 detik antar search
    }

    setSearchingAll(false)
    setSearchProgress(0)
  }

  // Edit manual
  const startEdit = (record: AlumniRecord) => {
    setEditingId(record.id)
    setEditForm({ ...record })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingId(editingId)

    const res = await fetch("/api/admin/update-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, data: editForm }),
    })

    if (res.ok) {
      setLocalRecords((prev) =>
        prev.map((r) =>
          r.id === editingId ? ({ ...r, ...editForm } as AlumniRecord) : r,
        ),
      )
      setEditingId(null)
      setEditForm({})
    } else {
      const d = await res.json()
      alert(`Gagal simpan: ${d.error}`)
    }
    setSavingId(null)
  }

  const pendingCount = localRecords.filter(
    (r) => r.search_status === "pending",
  ).length

  return (
    <div className="space-y-4">
      {/* Filter & Search */}
      <div className="card p-4 space-y-3">
        <form
          method="GET"
          action="/admin/tracking"
          className="flex gap-3 flex-wrap"
        >
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Cari nama atau NIM..."
            className="input-field flex-1 min-w-48"
          />
          {params.status && (
            <input type="hidden" name="status" value={params.status} />
          )}
          {params.fakultas && (
            <input type="hidden" name="fakultas" value={params.fakultas} />
          )}
          {params.prodi && (
            <input type="hidden" name="prodi" value={params.prodi} />
          )}
          {params.tahun && (
            <input type="hidden" name="tahun" value={params.tahun} />
          )}
          <button type="submit" className="btn-primary px-5 text-sm">
            Cari
          </button>
        </form>

        {/* Filter dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              name: "fakultas",
              label: "Semua Fakultas",
              options: uniqueFakultas,
            },
            { name: "prodi", label: "Semua Prodi", options: uniqueProdi },
            { name: "tahun", label: "Semua Angkatan", options: uniqueTahun },
          ].map((f) => (
            <form key={f.name} method="GET" action="/admin/tracking">
              {Object.entries(params)
                .filter(([k, v]) => k !== f.name && v)
                .map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
              <select
                name={f.name}
                defaultValue={params[f.name] ?? ""}
                onChange={(e) =>
                  (e.target.closest("form") as HTMLFormElement)?.submit()
                }
                className={`input-field text-sm w-full ${params[f.name] ? "border-blue-300 bg-blue-50 text-blue-700" : ""}`}
              >
                <option value="">{f.label}</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </form>
          ))}

          {/* Filter status */}
          <form method="GET" action="/admin/tracking">
            {Object.entries(params)
              .filter(([k, v]) => k !== "status" && v)
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <select
              name="status"
              defaultValue={params.status ?? ""}
              onChange={(e) =>
                (e.target.closest("form") as HTMLFormElement)?.submit()
              }
              className={`input-field text-sm w-full ${params.status ? "border-blue-300 bg-blue-50 text-blue-700" : ""}`}
            >
              <option value="">Semua Status</option>
              <option value="pending">⏳ Belum Dicari</option>
              <option value="found">✅ Ditemukan</option>
              <option value="not_found">❌ Tidak Ditemukan</option>
            </select>
          </form>
        </div>

        {/* Active filters */}
        {Object.entries(params).some(([k, v]) => k !== "page" && v) && (
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
            <span className="text-xs text-slate-400">Filter aktif:</span>
            {Object.entries(params)
              .filter(([k, v]) => k !== "page" && v)
              .map(([k, v]) => (
                <Link
                  key={k}
                  href={buildUrl({ [k]: undefined, page: "1" })}
                  className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  {v} ✕
                </Link>
              ))}
            <Link
              href="/admin/tracking"
              className="text-xs text-slate-400 hover:text-red-500 ml-1"
            >
              Hapus semua
            </Link>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">
            {total.toLocaleString("id-ID")}
          </span>{" "}
          data ditemukan
          {" · "}halaman {page} dari {totalPages}
        </p>
        <div className="flex items-center gap-3">
          {searchingAll && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Mencari {searchProgress}%
            </div>
          )}
          {pendingCount > 0 && !searchingAll && (
            <button
              onClick={triggerSearchAll}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
            >
              🔍 Cari Semua Pending ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Tabel */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[
                  "Nama & NIM",
                  "Prodi / Angkatan",
                  "Kontak & Sosmed",
                  "Pekerjaan",
                  "Status",
                  "Aksi",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {localRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="font-medium">Tidak ada data ditemukan</p>
                    <p className="text-xs mt-1">Coba ubah filter pencarian</p>
                  </td>
                </tr>
              ) : (
                localRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Nama & NIM */}
                    <td className="px-4 py-3 min-w-48">
                      <p className="font-semibold text-slate-800 text-sm">
                        {record.nama_lulusan}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {record.nim || "-"}
                      </p>
                      {record.is_claimed && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                          🔐 Akun aktif
                        </span>
                      )}
                      {record.is_verified && (
                        <span className="text-xs bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full mt-1 ml-1 inline-block">
                          ✓ Terverifikasi
                        </span>
                      )}
                    </td>

                    {/* Prodi & Angkatan */}
                    <td className="px-4 py-3 min-w-40">
                      <p className="text-sm text-slate-700">
                        {record.program_studi || "-"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {record.fakultas || ""}
                      </p>
                      <p className="text-xs text-slate-400">
                        Angkatan {record.tahun_masuk || "-"}
                      </p>
                    </td>

                    {/* Kontak & Sosmed */}
                    <td className="px-4 py-3 min-w-44">
                      {record.email && (
                        <p className="text-xs text-slate-600 truncate max-w-40 mb-1">
                          ✉️ {record.email}
                        </p>
                      )}
                      {record.no_hp && (
                        <p className="text-xs text-slate-600 mb-1">
                          📱 {record.no_hp}
                        </p>
                      )}
                      <div className="flex gap-1 flex-wrap mt-1">
                        {record.linkedin_url && (
                          <a
                            href={record.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full hover:bg-blue-200 font-medium"
                          >
                            in
                          </a>
                        )}
                        {record.instagram_url && (
                          <a
                            href={record.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full hover:bg-pink-200 font-medium"
                          >
                            ig
                          </a>
                        )}
                        {record.facebook_url && (
                          <a
                            href={record.facebook_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full hover:bg-indigo-200 font-medium"
                          >
                            fb
                          </a>
                        )}
                        {record.tiktok_url && (
                          <a
                            href={record.tiktok_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full hover:bg-slate-200 font-medium"
                          >
                            tt
                          </a>
                        )}
                        {!record.linkedin_url &&
                          !record.instagram_url &&
                          !record.facebook_url &&
                          !record.tiktok_url && (
                            <span className="text-xs text-slate-300 italic">
                              Belum ada
                            </span>
                          )}
                      </div>
                    </td>

                    {/* Pekerjaan */}
                    <td className="px-4 py-3 min-w-40">
                      {record.tempat_bekerja ? (
                        <>
                          <p className="text-sm text-slate-700 truncate max-w-40">
                            {record.tempat_bekerja}
                          </p>
                          {record.posisi && (
                            <p className="text-xs text-slate-500">
                              {record.posisi}
                            </p>
                          )}
                          {record.tipe_pekerjaan && (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block ${
                                record.tipe_pekerjaan === "pns"
                                  ? "bg-blue-100 text-blue-700"
                                  : record.tipe_pekerjaan === "swasta"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {TIPE_LABEL[record.tipe_pekerjaan] ||
                                record.tipe_pekerjaan}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-300 italic">
                          Belum diisi
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_BADGE[record.search_status] || "bg-slate-100 text-slate-400"}`}
                      >
                        {STATUS_LABEL[record.search_status] ||
                          record.search_status}
                      </span>
                      {record.last_searched_at && (
                        <p className="text-xs text-slate-300 mt-1">
                          {new Date(record.last_searched_at).toLocaleDateString(
                            "id-ID",
                          )}
                        </p>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => triggerSearch(record)}
                          disabled={searching === record.id || searchingAll}
                          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 whitespace-nowrap border border-blue-100"
                        >
                          {searching === record.id ? (
                            <span className="flex items-center gap-1">
                              <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                              Mencari...
                            </span>
                          ) : (
                            "🔍 Google Search"
                          )}
                        </button>
                        <button
                          onClick={() => startEdit(record)}
                          className="text-xs font-medium text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap border border-slate-100"
                        >
                          ✏️ Edit Manual
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50">
            <p className="text-sm text-slate-500">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="btn-secondary text-sm py-1.5 px-4"
                >
                  ← Sebelumnya
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="btn-primary text-sm py-1.5 px-4"
                >
                  Selanjutnya →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Edit Manual */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingId(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800">Edit Data Alumni</h2>
                <p className="text-slate-400 text-sm">
                  {editForm.nama_lulusan}
                </p>
              </div>
              <button
                onClick={() => setEditingId(null)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Kontak */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Kontak
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Email</label>
                    <input
                      className="input-field"
                      value={editForm.email || ""}
                      placeholder="email@domain.com"
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">No. HP</label>
                    <input
                      className="input-field"
                      value={editForm.no_hp || ""}
                      placeholder="08xxxxxxxxxx"
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, no_hp: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Sosial Media */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Sosial Media
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      key: "linkedin_url",
                      label: "LinkedIn",
                      ph: "https://linkedin.com/in/...",
                    },
                    {
                      key: "instagram_url",
                      label: "Instagram",
                      ph: "https://instagram.com/...",
                    },
                    {
                      key: "facebook_url",
                      label: "Facebook",
                      ph: "https://facebook.com/...",
                    },
                    {
                      key: "tiktok_url",
                      label: "TikTok",
                      ph: "https://tiktok.com/@...",
                    },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="label">{f.label}</label>
                      <input
                        className="input-field"
                        value={(editForm as any)[f.key] || ""}
                        placeholder={f.ph}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            [f.key]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pekerjaan */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Pekerjaan
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className="label">Tempat Bekerja</label>
                    <input
                      className="input-field"
                      value={editForm.tempat_bekerja || ""}
                      placeholder="Nama perusahaan/instansi"
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          tempat_bekerja: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Alamat Bekerja</label>
                    <input
                      className="input-field"
                      value={editForm.alamat_bekerja || ""}
                      placeholder="Kota / alamat"
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          alamat_bekerja: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Posisi / Jabatan</label>
                    <input
                      className="input-field"
                      value={editForm.posisi || ""}
                      placeholder="Software Engineer, dll"
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, posisi: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Tipe Pekerjaan</label>
                    <select
                      className="input-field"
                      value={editForm.tipe_pekerjaan || ""}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          tipe_pekerjaan: e.target.value,
                        }))
                      }
                    >
                      <option value="">Pilih</option>
                      <option value="pns">PNS / ASN</option>
                      <option value="swasta">Swasta</option>
                      <option value="wirausaha">Wirausaha</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sosmed Tempat Kerja */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Sosmed Tempat Bekerja
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className="label">Website Perusahaan</label>
                    <input
                      className="input-field"
                      value={editForm.company_website || ""}
                      placeholder="https://..."
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          company_website: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Instagram Perusahaan</label>
                    <input
                      className="input-field"
                      value={editForm.company_instagram || ""}
                      placeholder="https://instagram.com/..."
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          company_instagram: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">LinkedIn Perusahaan</label>
                    <input
                      className="input-field"
                      value={editForm.company_linkedin || ""}
                      placeholder="https://linkedin.com/company/..."
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          company_linkedin: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Verifikasi */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <input
                  type="checkbox"
                  id="is_verified"
                  checked={editForm.is_verified || false}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      is_verified: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-blue-600"
                />
                <label
                  htmlFor="is_verified"
                  className="text-sm text-slate-700 cursor-pointer"
                >
                  Tandai data ini sebagai terverifikasi
                </label>
              </div>
            </div>

            <div className="flex justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setEditingId(null)}
                className="btn-secondary text-sm py-2 px-4"
              >
                Batal
              </button>
              <button
                onClick={saveEdit}
                disabled={!!savingId}
                className="btn-primary text-sm py-2 px-4"
              >
                {savingId ? "Menyimpan..." : "Simpan Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
