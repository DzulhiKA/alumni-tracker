"use client"

import { useState } from "react"
import { STATUS_LABELS } from "@/lib/database.types"
import type { Profile, CurrentStatus } from "@/lib/database.types"

interface ExportCSVProps {
  alumni: Profile[]
}

// Kolom yang bisa dipilih untuk export
const COLUMNS = [
  { key: "full_name", label: "Nama Lengkap", default: true },
  { key: "nim", label: "NIM", default: true },
  { key: "email", label: "Email", default: true },
  { key: "phone", label: "No. Telepon", default: false },
  { key: "gender", label: "Jenis Kelamin", default: false },
  { key: "date_of_birth", label: "Tanggal Lahir", default: false },
  { key: "city", label: "Kota Domisili", default: false },
  { key: "faculty", label: "Fakultas", default: true },
  { key: "major", label: "Program Studi", default: true },
  { key: "graduation_year", label: "Tahun Lulus", default: true },
  { key: "gpa", label: "IPK", default: false },
  { key: "current_status", label: "Status", default: true },
  { key: "current_job_title", label: "Jabatan", default: true },
  { key: "current_company", label: "Perusahaan", default: true },
  { key: "work_field", label: "Bidang Pekerjaan", default: false },
  { key: "work_city", label: "Kota Bekerja", default: false },
  { key: "linkedin_url", label: "LinkedIn", default: false },
  { key: "github_url", label: "GitHub", default: false },
  { key: "is_visible", label: "Profil Publik", default: false },
  { key: "created_at", label: "Tanggal Daftar", default: false },
]

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return ""
  if (key === "current_status")
    return STATUS_LABELS[value as CurrentStatus] || String(value)
  if (key === "gender")
    return value === "male"
      ? "Laki-laki"
      : value === "female"
        ? "Perempuan"
        : ""
  if (key === "is_visible") return value ? "Ya" : "Tidak"
  if (key === "created_at")
    return new Date(value as string).toLocaleDateString("id-ID")
  return String(value)
}

function generateCSV(alumni: Profile[], selectedCols: string[]): string {
  const cols = COLUMNS.filter((c) => selectedCols.includes(c.key))

  // Header row
  const header = cols.map((c) => `"${c.label}"`).join(",")

  // Data rows
  const rows = alumni.map((a) =>
    cols
      .map((c) => {
        const val = formatValue(c.key, a[c.key as keyof Profile])
        // Escape quote dan koma
        return `"${val.replace(/"/g, '""')}"`
      })
      .join(","),
  )

  return [header, ...rows].join("\n")
}

function downloadCSV(content: string, filename: string) {
  // BOM untuk Excel agar baca UTF-8 dengan benar (huruf Indonesia)
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ExportCSVModal({ alumni }: ExportCSVProps) {
  const [open, setOpen] = useState(false)
  const [selectedCols, setSelectedCols] = useState<string[]>(
    COLUMNS.filter((c) => c.default).map((c) => c.key),
  )
  const [filterVisible, setFilterVisible] = useState<
    "all" | "visible" | "hidden"
  >("all")
  const [exported, setExported] = useState(false)

  const toggleCol = (key: string) => {
    setSelectedCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const selectAll = () => setSelectedCols(COLUMNS.map((c) => c.key))
  const selectDefault = () =>
    setSelectedCols(COLUMNS.filter((c) => c.default).map((c) => c.key))

  const filteredAlumni = alumni.filter((a) => {
    if (filterVisible === "visible") return a.is_visible
    if (filterVisible === "hidden") return !a.is_visible
    return true
  })

  const handleExport = () => {
    if (selectedCols.length === 0) return
    const csv = generateCSV(filteredAlumni, selectedCols)
    const date = new Date().toISOString().split("T")[0]
    downloadCSV(csv, `data-alumni-${date}.csv`)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
      >
        📥 Export CSV
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">
                  Export Data Alumni
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  {filteredAlumni.length} alumni akan diekspor
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Filter alumni */}
              <div>
                <label className="label">Filter Alumni</label>
                <div className="flex gap-2">
                  {[
                    { value: "all", label: `Semua (${alumni.length})` },
                    {
                      value: "visible",
                      label: `Publik (${alumni.filter((a) => a.is_visible).length})`,
                    },
                    {
                      value: "hidden",
                      label: `Tersembunyi (${alumni.filter((a) => !a.is_visible).length})`,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setFilterVisible(opt.value as typeof filterVisible)
                      }
                      className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                        filterVisible === opt.value
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilih kolom */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">
                    Pilih Kolom ({selectedCols.length}/{COLUMNS.length})
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectDefault}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Default
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={selectAll}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => setSelectedCols([])}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3">
                  {COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                        selectedCols.includes(col.key)
                          ? "bg-white border border-blue-200 shadow-sm"
                          : "hover:bg-white/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCols.includes(col.key)}
                        onChange={() => toggleCol(col.key)}
                        className="w-3.5 h-3.5 accent-blue-600 flex-shrink-0"
                      />
                      <span className="text-sm text-slate-700 truncate">
                        {col.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                💡 File CSV bisa langsung dibuka di{" "}
                <strong>Microsoft Excel</strong> atau{" "}
                <strong>Google Sheets</strong>. Karakter bahasa Indonesia (huruf
                ç, dll) sudah didukung.
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setOpen(false)}
                className="btn-secondary text-sm py-2 px-4"
              >
                Batal
              </button>
              <button
                onClick={handleExport}
                disabled={
                  selectedCols.length === 0 || filteredAlumni.length === 0
                }
                className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-all text-sm ${
                  exported
                    ? "bg-emerald-500 text-white"
                    : "btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                }`}
              >
                {exported
                  ? "✅ Berhasil diunduh!"
                  : `📥 Download CSV (${filteredAlumni.length} alumni)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
