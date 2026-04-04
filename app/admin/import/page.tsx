"use client"

import { useState, useRef, useCallback } from "react"
import * as XLSX from "xlsx"

interface ImportStats {
  total: number
  imported: number
  skipped: number
  errors: number
}

interface AlumniRow {
  nama_lulusan: string
  nim: string
  tahun_masuk?: number
  tanggal_lulus?: string
  fakultas?: string
  program_studi?: string
}

const BATCH_SIZE = 500 // kirim 500 baris per request

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">(
    "upload",
  )
  const [rows, setRows] = useState<AlumniRow[]>([])
  const [fileName, setFileName] = useState("")
  const [stats, setStats] = useState<ImportStats>({
    total: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
  })
  const [progress, setProgress] = useState(0) // 0-100
  const [error, setError] = useState("")
  const [colMap, setColMap] = useState<Record<string, string>>({})
  const [headers, setHeaders] = useState<string[]>([])

  // Kolom yang diharapkan
  const EXPECTED_COLS = [
    { key: "nama_lulusan", label: "Nama Lulusan", required: true },
    { key: "nim", label: "NIM", required: true },
    { key: "tahun_masuk", label: "Tahun Masuk", required: false },
    { key: "tanggal_lulus", label: "Tanggal Lulus", required: false },
    { key: "fakultas", label: "Fakultas", required: false },
    { key: "program_studi", label: "Program Studi", required: false },
  ]

  // Auto-detect kolom berdasarkan nama header
  const autoDetect = useCallback((hdrs: string[]) => {
    const map: Record<string, string> = {}
    const patterns: Record<string, string[]> = {
      nama_lulusan: ["nama", "name", "lulusan", "nama lulusan"],
      nim: ["nim", "nomor induk", "student id", "no mahasiswa"],
      tahun_masuk: ["tahun masuk", "angkatan", "year", "masuk"],
      tanggal_lulus: ["tanggal lulus", "lulus", "graduation", "tanggal"],
      fakultas: ["fakultas", "faculty", "fak"],
      program_studi: ["program studi", "prodi", "jurusan", "major", "program"],
    }

    hdrs.forEach((h) => {
      const lower = h.toLowerCase().trim()
      for (const [key, pats] of Object.entries(patterns)) {
        if (!map[key] && pats.some((p) => lower.includes(p))) {
          map[key] = h
        }
      }
    })
    return map
  }, [])

  const handleFile = async (file: File) => {
    setError("")
    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

      if (data.length < 2) {
        setError("File kosong atau tidak valid")
        return
      }

      const hdrs = (data[0] as string[]).map((h) => String(h || "").trim())
      setHeaders(hdrs)

      const detected = autoDetect(hdrs)
      setColMap(detected)
      setStep("preview")

      // Preview 5 baris pertama untuk konfirmasi
      const preview = data.slice(1, 6).map((row) => {
        const obj: Record<string, any> = {}
        hdrs.forEach((h, i) => {
          obj[h] = row[i]
        })
        return obj
      })

      // Hitung total baris data
      const totalRows = data
        .slice(1)
        .filter((r) =>
          r.some((c) => c !== null && c !== undefined && c !== ""),
        ).length
      setStats((s) => ({ ...s, total: totalRows }))

      // Simpan semua rows untuk import
      const allRows: AlumniRow[] = data
        .slice(1)
        .filter((r) => r.some((c) => c !== null && c !== undefined && c !== ""))
        .map((row) => {
          const obj: Record<string, any> = {}
          hdrs.forEach((h, i) => {
            obj[h] = row[i]
          })
          return obj
        })
      setRows(allRows)
    } catch (e: any) {
      setError(`Gagal baca file: ${e.message}`)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const buildRow = (raw: Record<string, any>): AlumniRow => ({
    nama_lulusan: String(raw[colMap.nama_lulusan] || "").trim(),
    nim: String(raw[colMap.nim] || "").trim(),
    tahun_masuk: colMap.tahun_masuk
      ? parseInt(raw[colMap.tahun_masuk]) || undefined
      : undefined,
    tanggal_lulus: colMap.tanggal_lulus
      ? String(raw[colMap.tanggal_lulus] || "").trim()
      : undefined,
    fakultas: colMap.fakultas
      ? String(raw[colMap.fakultas] || "").trim()
      : undefined,
    program_studi: colMap.program_studi
      ? String(raw[colMap.program_studi] || "").trim()
      : undefined,
  })

  const handleImport = async () => {
    if (!colMap.nama_lulusan || !colMap.nim) {
      setError("Harap petakan kolom Nama Lulusan dan NIM terlebih dahulu")
      return
    }

    setStep("importing")
    setError("")

    const processedRows = rows.map(buildRow)
    const totalBatches = Math.ceil(processedRows.length / BATCH_SIZE)

    let totalImported = 0,
      totalSkipped = 0,
      totalErrors = 0

    for (let i = 0; i < totalBatches; i++) {
      const batch = processedRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)

      try {
        const res = await fetch("/api/admin/import-alumni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        })

        const data = await res.json()
        if (res.ok) {
          totalImported += data.imported || 0
          totalSkipped += data.skipped || 0
          totalErrors += data.errors || 0
        } else {
          totalErrors += batch.length
          console.error(`Batch ${i + 1} error:`, data.error)
        }
      } catch (e) {
        totalErrors += batch.length
        console.error(`Batch ${i + 1} failed:`, e)
      }

      // Update progress
      const pct = Math.round(((i + 1) / totalBatches) * 100)
      setProgress(pct)
      setStats({
        total: processedRows.length,
        imported: totalImported,
        skipped: totalSkipped,
        errors: totalErrors,
      })

      // Jeda kecil antar batch agar tidak overwhelm server
      if (i < totalBatches - 1) await delay(200)
    }

    setStep("done")
  }

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

  const reset = () => {
    setStep("upload")
    setRows([])
    setFileName("")
    setProgress(0)
    setStats({ total: 0, imported: 0, skipped: 0, errors: 0 })
    setError("")
    setColMap({})
    setHeaders([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ============ RENDER ============
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Import Data Alumni
        </h1>
        <p className="text-slate-500 mt-0.5">
          Upload file Excel (.xlsx) untuk import data alumni secara massal
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {["Upload File", "Petakan Kolom", "Import", "Selesai"].map((s, i) => {
          const stepKeys = ["upload", "preview", "importing", "done"]
          const current = stepKeys.indexOf(step)
          const done = i < current
          const active = i === current
          return (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className={`text-xs mt-1 font-medium hidden sm:block ${active ? "text-blue-600" : "text-slate-400"}`}
                >
                  {s}
                </span>
              </div>
              {i < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-4 ${done ? "bg-emerald-400" : "bg-slate-100"}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
          ❌ {error}
        </div>
      )}

      {/* ===== STEP: UPLOAD ===== */}
      {step === "upload" && (
        <div
          className="card p-8 border-2 border-dashed border-slate-200 hover:border-blue-300 transition-colors text-center cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0])
            }}
          />
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-bold text-slate-700 text-lg">
            Drag & drop file Excel di sini
          </h3>
          <p className="text-slate-400 text-sm mt-1 mb-4">
            atau klik untuk pilih file
          </p>
          <span className="inline-block bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full">
            Format: .xlsx, .xls, .csv — Max 140.000 baris
          </span>
          <div className="mt-6 bg-slate-50 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-slate-600 mb-2">
              Kolom yang diharapkan:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                "Nama Lulusan *",
                "NIM *",
                "Tahun Masuk",
                "Tanggal Lulus",
                "Fakultas",
                "Program Studi",
              ].map((c) => (
                <span
                  key={c}
                  className={`text-xs px-2 py-1 rounded-lg ${c.includes("*") ? "bg-blue-100 text-blue-700 font-semibold" : "bg-slate-100 text-slate-500"}`}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP: PREVIEW & PETAKAN KOLOM ===== */}
      {step === "preview" && (
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-slate-800">📄 {fileName}</p>
                <p className="text-slate-500 text-sm mt-0.5">
                  {stats.total.toLocaleString("id-ID")} baris data ditemukan
                </p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                ✕ Ganti file
              </button>
            </div>

            {/* Peta kolom */}
            <h3 className="font-semibold text-slate-700 text-sm mb-3">
              Petakan kolom Excel ke sistem:
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {EXPECTED_COLS.map((col) => (
                <div key={col.key}>
                  <label className="text-xs font-medium text-slate-600 block mb-1">
                    {col.label}{" "}
                    {col.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    className={`input-field text-sm ${colMap[col.key] ? "border-blue-300 bg-blue-50" : ""}`}
                    value={colMap[col.key] || ""}
                    onChange={(e) =>
                      setColMap((p) => ({ ...p, [col.key]: e.target.value }))
                    }
                  >
                    <option value="">— Pilih kolom —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview tabel */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <p className="font-semibold text-slate-700 text-sm">
                Preview 5 baris pertama:
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {EXPECTED_COLS.filter((c) => colMap[c.key]).map((c) => (
                      <th
                        key={c.key}
                        className="px-3 py-2 text-left text-slate-500 font-semibold uppercase tracking-wide"
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.slice(0, 5).map((row: any, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {EXPECTED_COLS.filter((c) => colMap[c.key]).map((c) => (
                        <td key={c.key} className="px-3 py-2 text-slate-600">
                          {String(row[colMap[c.key]] || "-")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={reset} className="btn-secondary">
              ← Kembali
            </button>
            <button
              onClick={handleImport}
              disabled={!colMap.nama_lulusan || !colMap.nim}
              className="btn-primary disabled:opacity-50"
            >
              Mulai Import {stats.total.toLocaleString("id-ID")} Data →
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP: IMPORTING ===== */}
      {step === "importing" && (
        <div className="card p-8 text-center space-y-5">
          <div className="text-5xl">⏳</div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">
              Sedang Mengimport Data...
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Harap jangan tutup halaman ini
            </p>
          </div>

          {/* Progress bar */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Progress</span>
              <span className="font-bold text-blue-600">{progress}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-3 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats realtime */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="bg-emerald-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-emerald-600">
                {stats.imported.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">Berhasil</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-amber-600">
                {stats.skipped.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Dilewati</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-500">
                {stats.errors.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-red-500 mt-0.5">Error</p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Batch:{" "}
            {Math.ceil((progress / 100) * Math.ceil(stats.total / BATCH_SIZE))}{" "}
            / {Math.ceil(stats.total / BATCH_SIZE)}
            &nbsp;· Ukuran batch: {BATCH_SIZE} baris
          </p>
        </div>
      )}

      {/* ===== STEP: DONE ===== */}
      {step === "done" && (
        <div className="card p-8 text-center space-y-5">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">✅</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xl">
              Import Selesai!
            </h3>
            <p className="text-slate-500 text-sm mt-1">File: {fileName}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-slate-700">
                {stats.total.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Total Baris</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-emerald-600">
                {stats.imported.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">Berhasil</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-amber-600">
                {stats.skipped.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Dilewati (duplikat)
              </p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-3xl font-bold text-red-500">
                {stats.errors.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-red-500 mt-0.5">Error</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-secondary">
              Import File Lain
            </button>
            <a href="/admin/tracking" className="btn-primary">
              Lanjut ke Tracking →
            </a>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-800 text-sm mb-2">
          ℹ️ Informasi Import
        </h3>
        <ul className="text-sm text-blue-700 space-y-1.5">
          <li>
            • Data diproses dalam batch <strong>500 baris</strong> per request
            untuk stabilitas
          </li>
          <li>
            • Alumni dengan NIM yang sudah ada akan <strong>dilewati</strong>{" "}
            (tidak ditimpa)
          </li>
          <li>
            • Setelah import selesai, gunakan fitur{" "}
            <strong>Google Search</strong> untuk tracking sosmed
          </li>
          <li>
            • Alumni bisa <strong>klaim data</strong> mereka setelah register
            dengan NIM yang sama
          </li>
        </ul>
      </div>
    </div>
  )
}
