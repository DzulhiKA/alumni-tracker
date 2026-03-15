"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FACULTY_OPTIONS, STATUS_LABELS } from "@/lib/database.types"
import type { CurrentStatus } from "@/lib/database.types"

const EMPTY_FORM = {
  // Akun
  email: "",
  password: "",
  // Data Pribadi
  full_name: "",
  nim: "",
  phone: "",
  city: "",
  // Akademik
  faculty: "",
  major: "",
  graduation_year: "",
  // Karir
  current_status: "" as CurrentStatus | "",
  current_job_title: "",
  current_company: "",
}

export default function AddAlumniModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError("")
  }

  const handleClose = () => {
    setOpen(false)
    setStep(1)
    setForm(EMPTY_FORM)
    setError("")
    setSuccess("")
  }

  const validateStep1 = () => {
    if (!form.full_name.trim()) {
      setError("Nama lengkap wajib diisi")
      return false
    }
    if (!form.email.trim()) {
      setError("Email wajib diisi")
      return false
    }
    if (!form.password || form.password.length < 6) {
      setError("Password minimal 6 karakter")
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!form.faculty) {
      setError("Fakultas wajib diisi")
      return false
    }
    if (!form.major.trim()) {
      setError("Program studi wajib diisi")
      return false
    }
    if (!form.graduation_year) {
      setError("Tahun lulus wajib diisi")
      return false
    }
    return true
  }

  const handleNext = () => {
    setError("")
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep((s) => (s + 1) as 1 | 2 | 3)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError("")

    const res = await fetch("/api/admin/create-alumni", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        graduation_year: form.graduation_year
          ? Number(form.graduation_year)
          : null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Gagal membuat akun alumni")
      setLoading(false)
      return
    }

    setSuccess(data.message)
    setLoading(false)
    router.refresh()
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from(
    { length: currentYear - 1989 },
    (_, i) => currentYear - i,
  )

  const steps = [
    { num: 1, label: "Akun & Identitas" },
    { num: 2, label: "Data Akademik" },
    { num: 3, label: "Karir" },
  ]

  return (
    <>
      {/* Tombol trigger */}
      <button
        onClick={() => setOpen(true)}
        className="btn-primary flex items-center gap-2"
      >
        <span className="text-lg leading-none">+</span>
        Tambah Alumni
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal box */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">
                  Tambah Alumni Manual
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Admin membuat akun untuk alumni
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Step indicator */}
            {!success && (
              <div className="flex items-center gap-0 px-6 pt-5">
                {steps.map((s, i) => (
                  <div key={s.num} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                          step > s.num
                            ? "bg-emerald-500 text-white"
                            : step === s.num
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {step > s.num ? "✓" : s.num}
                      </div>
                      <span
                        className={`text-xs mt-1 font-medium whitespace-nowrap ${
                          step === s.num ? "text-blue-600" : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${
                          step > s.num ? "bg-emerald-400" : "bg-slate-100"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Sukses */}
              {success ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-3xl">✅</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">
                      Berhasil!
                    </p>
                    <p className="text-slate-500 text-sm mt-1">{success}</p>
                    <p className="text-slate-400 text-xs mt-2">
                      Alumni bisa login dengan email dan password yang sudah
                      dibuat.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center pt-2">
                    <button onClick={handleClose} className="btn-secondary">
                      Tutup
                    </button>
                    <button
                      onClick={() => {
                        setStep(1)
                        setForm(EMPTY_FORM)
                        setSuccess("")
                        setError("")
                      }}
                      className="btn-primary"
                    >
                      Tambah Lagi
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}

                  {/* === STEP 1: Akun & Identitas === */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <Field label="Nama Lengkap *">
                        <input
                          className="input-field"
                          value={form.full_name}
                          onChange={(e) =>
                            handleChange("full_name", e.target.value)
                          }
                          placeholder="Nama sesuai ijazah"
                        />
                      </Field>
                      <Field label="NIM">
                        <input
                          className="input-field"
                          value={form.nim}
                          onChange={(e) => handleChange("nim", e.target.value)}
                          placeholder="Nomor Induk Mahasiswa"
                        />
                      </Field>
                      <Field label="Email *">
                        <input
                          type="email"
                          className="input-field"
                          value={form.email}
                          onChange={(e) =>
                            handleChange("email", e.target.value)
                          }
                          placeholder="email@domain.com"
                        />
                      </Field>
                      <Field label="Password *">
                        <input
                          type="password"
                          className="input-field"
                          value={form.password}
                          onChange={(e) =>
                            handleChange("password", e.target.value)
                          }
                          placeholder="Min. 6 karakter"
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="No. Telepon">
                          <input
                            className="input-field"
                            value={form.phone}
                            onChange={(e) =>
                              handleChange("phone", e.target.value)
                            }
                            placeholder="08xxxxxxxxxx"
                          />
                        </Field>
                        <Field label="Kota">
                          <input
                            className="input-field"
                            value={form.city}
                            onChange={(e) =>
                              handleChange("city", e.target.value)
                            }
                            placeholder="Kota domisili"
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {/* === STEP 2: Akademik === */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <Field label="Fakultas *">
                        <select
                          className="input-field"
                          value={form.faculty}
                          onChange={(e) =>
                            handleChange("faculty", e.target.value)
                          }
                        >
                          <option value="">Pilih Fakultas</option>
                          {FACULTY_OPTIONS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Program Studi *">
                        <input
                          className="input-field"
                          value={form.major}
                          onChange={(e) =>
                            handleChange("major", e.target.value)
                          }
                          placeholder="Contoh: Teknik Informatika"
                        />
                      </Field>
                      <Field label="Tahun Lulus *">
                        <select
                          className="input-field"
                          value={form.graduation_year}
                          onChange={(e) =>
                            handleChange("graduation_year", e.target.value)
                          }
                        >
                          <option value="">Pilih tahun</option>
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  )}

                  {/* === STEP 3: Karir === */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <Field label="Status Saat Ini">
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            Object.entries(STATUS_LABELS) as [
                              CurrentStatus,
                              string,
                            ][]
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                handleChange("current_status", key)
                              }
                              className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all text-left ${
                                form.current_status === key
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Jabatan / Posisi">
                        <input
                          className="input-field"
                          value={form.current_job_title}
                          onChange={(e) =>
                            handleChange("current_job_title", e.target.value)
                          }
                          placeholder="Contoh: Software Engineer"
                        />
                      </Field>
                      <Field label="Perusahaan / Institusi">
                        <input
                          className="input-field"
                          value={form.current_company}
                          onChange={(e) =>
                            handleChange("current_company", e.target.value)
                          }
                          placeholder="Nama perusahaan atau institusi"
                        />
                      </Field>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <p className="text-xs text-amber-700">
                          <strong>Info:</strong> Data karir ini opsional dan
                          bisa dilengkapi alumni sendiri setelah login.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer navigasi */}
            {!success && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <button
                  onClick={() =>
                    step > 1
                      ? setStep((s) => (s - 1) as 1 | 2 | 3)
                      : handleClose()
                  }
                  className="btn-secondary text-sm py-2 px-4"
                >
                  {step === 1 ? "Batal" : "← Kembali"}
                </button>
                {step < 3 ? (
                  <button
                    onClick={handleNext}
                    className="btn-primary text-sm py-2 px-5"
                  >
                    Lanjut →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-primary text-sm py-2 px-5"
                  >
                    {loading ? "Membuat akun..." : "✓ Buat Akun Alumni"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
