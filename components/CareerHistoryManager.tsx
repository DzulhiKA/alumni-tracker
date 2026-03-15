"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import type { CareerHistory } from "@/lib/database.types"

interface CareerHistoryManagerProps {
  userId: string
}

const EMPTY_FORM = {
  job_title: "",
  company: "",
  start_year: "",
  end_year: "",
  is_current: false,
  description: "",
}

export default function CareerHistoryManager({
  userId,
}: CareerHistoryManagerProps) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [careers, setCareers] = useState<CareerHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState("")

  // Load riwayat karir
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("career_history")
        .select("*")
        .eq("profile_id", userId)
        .order("is_current", { ascending: false })
        .order("start_year", { ascending: false })

      setCareers(data || [])
      setLoading(false)
    }
    load()
  }, [userId])

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      // Jika is_current dicentang, kosongkan end_year
      if (field === "is_current" && value === true) {
        updated.end_year = ""
      }
      return updated
    })
    setError("")
  }

  const handleEdit = (career: CareerHistory) => {
    setEditingId(career.id)
    setForm({
      job_title: career.job_title,
      company: career.company,
      start_year: career.start_year ? String(career.start_year) : "",
      end_year: career.end_year ? String(career.end_year) : "",
      is_current: career.is_current,
      description: career.description || "",
    })
    setShowForm(true)
    setError("")
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError("")
  }

  const handleSave = async () => {
    // Validasi
    if (!form.job_title.trim()) {
      setError("Jabatan/posisi wajib diisi.")
      return
    }
    if (!form.company.trim()) {
      setError("Nama perusahaan wajib diisi.")
      return
    }
    if (!form.start_year) {
      setError("Tahun mulai wajib diisi.")
      return
    }
    if (
      !form.is_current &&
      form.end_year &&
      Number(form.end_year) < Number(form.start_year)
    ) {
      setError("Tahun selesai tidak boleh lebih kecil dari tahun mulai.")
      return
    }

    setSaving(true)
    setError("")

    const payload = {
      profile_id: userId,
      job_title: form.job_title.trim(),
      company: form.company.trim(),
      start_year: Number(form.start_year),
      end_year: form.is_current
        ? null
        : form.end_year
          ? Number(form.end_year)
          : null,
      is_current: form.is_current,
      description: form.description.trim() || null,
    }

    if (editingId) {
      // Update
      const { data, error: err } = await supabase
        .from("career_history")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single()

      if (err) {
        setError(`Gagal menyimpan: ${err.message}`)
        setSaving(false)
        return
      }
      setCareers((prev) => prev.map((c) => (c.id === editingId ? data : c)))
    } else {
      // Insert
      const { data, error: err } = await supabase
        .from("career_history")
        .insert(payload)
        .select()
        .single()

      if (err) {
        setError(`Gagal menyimpan: ${err.message}`)
        setSaving(false)
        return
      }
      setCareers((prev) => [data, ...prev])
    }

    setSaving(false)
    handleCancel()
  }

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setDeletingId(id)
    const { error: err } = await supabase
      .from("career_history")
      .delete()
      .eq("id", id)

    if (err) {
      setError(`Gagal menghapus: ${err.message}`)
    } else {
      setCareers((prev) => prev.filter((c) => c.id !== id))
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from(
    { length: currentYear - 1989 },
    (_, i) => currentYear - i,
  )

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
            Riwayat Karir
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {careers.length} entri tersimpan
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
              setForm(EMPTY_FORM)
            }}
            className="btn-primary text-sm py-2 px-4"
          >
            + Tambah
          </button>
        )}
      </div>

      {/* Form tambah/edit */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-blue-800 text-sm">
            {editingId ? "✏️ Edit Riwayat Karir" : "➕ Tambah Riwayat Karir"}
          </h4>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Jabatan / Posisi *</label>
              <input
                className="input-field"
                value={form.job_title}
                onChange={(e) => handleChange("job_title", e.target.value)}
                placeholder="Contoh: Software Engineer"
              />
            </div>
            <div>
              <label className="label">Perusahaan / Institusi *</label>
              <input
                className="input-field"
                value={form.company}
                onChange={(e) => handleChange("company", e.target.value)}
                placeholder="Contoh: PT. Teknologi Maju"
              />
            </div>
            <div>
              <label className="label">Tahun Mulai *</label>
              <select
                className="input-field"
                value={form.start_year}
                onChange={(e) => handleChange("start_year", e.target.value)}
              >
                <option value="">Pilih tahun</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tahun Selesai</label>
              <select
                className="input-field"
                value={form.end_year}
                onChange={(e) => handleChange("end_year", e.target.value)}
                disabled={form.is_current}
              >
                <option value="">Pilih tahun</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checkbox pekerjaan saat ini */}
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-blue-100">
            <input
              type="checkbox"
              id="is_current"
              checked={form.is_current}
              onChange={(e) => handleChange("is_current", e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label
              htmlFor="is_current"
              className="text-sm text-slate-700 cursor-pointer"
            >
              Ini adalah pekerjaan / posisi saya saat ini
            </label>
          </div>

          <div>
            <label className="label">
              Deskripsi{" "}
              <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              className="input-field h-20 resize-none"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Ceritakan tanggung jawab atau pencapaian Anda..."
              maxLength={300}
            />
            <p className="text-xs text-slate-400 mt-1">
              {form.description.length}/300
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={handleCancel}
              className="btn-secondary text-sm py-2 px-4"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm py-2 px-4"
            >
              {saving
                ? "Menyimpan..."
                : editingId
                  ? "Simpan Perubahan"
                  : "Tambah"}
            </button>
          </div>
        </div>
      )}

      {/* Daftar riwayat karir */}
      {careers.length === 0 && !showForm ? (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-2xl mb-2">💼</p>
          <p className="text-slate-500 text-sm">Belum ada riwayat karir</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Klik "+ Tambah" untuk menambahkan pengalaman kerja Anda
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {careers.map((career) => (
            <div
              key={career.id}
              className={`bg-white border rounded-2xl p-4 transition-all ${
                career.is_current
                  ? "border-blue-200 bg-blue-50/30"
                  : "border-slate-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Ikon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                      career.is_current ? "bg-blue-100" : "bg-slate-100"
                    }`}
                  >
                    💼
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">
                        {career.job_title}
                      </p>
                      {career.is_current && (
                        <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                          Saat ini
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">{career.company}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {career.start_year}
                      {career.is_current
                        ? " — Sekarang"
                        : career.end_year
                          ? ` — ${career.end_year}`
                          : ""}
                      {career.start_year &&
                        (career.end_year || career.is_current) && (
                          <span className="ml-1 text-slate-300">
                            ·{" "}
                            {career.is_current
                              ? currentYear - (career.start_year || currentYear)
                              : (career.end_year || currentYear) -
                                (career.start_year || 0)}{" "}
                            tahun
                          </span>
                        )}
                    </p>
                    {career.description && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {career.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tombol aksi */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(career)}
                    disabled={showForm}
                    className="text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all disabled:opacity-30"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(career.id)}
                    disabled={deletingId === career.id}
                    className={`text-xs p-1.5 rounded-lg transition-all ${
                      confirmDeleteId === career.id
                        ? "bg-red-500 text-white"
                        : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                    }`}
                    title={
                      confirmDeleteId === career.id
                        ? "Klik lagi untuk konfirmasi"
                        : "Hapus"
                    }
                  >
                    {deletingId === career.id
                      ? "..."
                      : confirmDeleteId === career.id
                        ? "✓ Hapus?"
                        : "🗑️"}
                  </button>
                  {confirmDeleteId === career.id && (
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
