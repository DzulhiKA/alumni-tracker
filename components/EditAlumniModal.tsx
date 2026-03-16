"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { STATUS_LABELS, FACULTY_OPTIONS } from "@/lib/database.types"
import type { Profile, CurrentStatus } from "@/lib/database.types"

interface EditAlumniModalProps {
  alumni: Profile
}

export default function EditAlumniModal({ alumni }: EditAlumniModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<
    "personal" | "academic" | "career"
  >("personal")
  const [form, setForm] = useState<Partial<Profile>>({ ...alumni })
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  )
  const [saveMsg, setSaveMsg] = useState("")

  const handleChange = (
    field: keyof Profile,
    value: string | number | boolean | null,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveStatus("idle")
  }

  const handleOpen = () => {
    setForm({ ...alumni }) // reset ke data terbaru setiap dibuka
    setActiveTab("personal")
    setSaveStatus("idle")
    setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus("idle")

    const payload = {
      full_name: form.full_name || null,
      nim: form.nim || null,
      phone: form.phone || null,
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      city: form.city || null,
      address: form.address || null,
      faculty: form.faculty || null,
      major: form.major || null,
      graduation_year: form.graduation_year || null,
      gpa: form.gpa || null,
      current_status: form.current_status || null,
      current_job_title: form.current_job_title || null,
      current_company: form.current_company || null,
      work_field: form.work_field || null,
      work_city: form.work_city || null,
      linkedin_url: form.linkedin_url || null,
      github_url: form.github_url || null,
      bio: form.bio || null,
      is_visible: form.is_visible !== false,
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", alumni.id)

    if (error) {
      setSaveStatus("error")
      setSaveMsg(`Gagal menyimpan: ${error.message}`)
    } else {
      setSaveStatus("success")
      setSaveMsg("Profil berhasil diperbarui!")
      router.refresh()
    }

    setSaving(false)
  }

  const tabs = [
    { key: "personal", label: "Pribadi", icon: "👤" },
    { key: "academic", label: "Akademik", icon: "🎓" },
    { key: "career", label: "Karir", icon: "💼" },
  ]

  const currentYear = new Date().getFullYear()

  return (
    <>
      {/* Trigger */}
      <button
        onClick={handleOpen}
        className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
      >
        Edit
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {alumni.full_name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">
                    Edit Profil Alumni
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {alumni.full_name || alumni.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-blue-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="px-6 py-4 space-y-4">
              {/* Tab Pribadi */}
              {activeTab === "personal" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Nama Lengkap">
                      <input
                        className="input-field"
                        value={form.full_name || ""}
                        onChange={(e) =>
                          handleChange("full_name", e.target.value)
                        }
                        placeholder="Nama lengkap"
                      />
                    </Field>
                    <Field label="NIM">
                      <input
                        className="input-field"
                        value={form.nim || ""}
                        onChange={(e) => handleChange("nim", e.target.value)}
                        placeholder="NIM"
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        className="input-field bg-slate-50"
                        value={form.email || ""}
                        disabled
                        title="Email tidak bisa diubah"
                      />
                    </Field>
                    <Field label="No. Telepon">
                      <input
                        className="input-field"
                        value={form.phone || ""}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="08xxxxxxxxxx"
                      />
                    </Field>
                    <Field label="Jenis Kelamin">
                      <select
                        className="input-field"
                        value={form.gender || ""}
                        onChange={(e) =>
                          handleChange("gender", e.target.value || null)
                        }
                      >
                        <option value="">Pilih</option>
                        <option value="male">Laki-laki</option>
                        <option value="female">Perempuan</option>
                      </select>
                    </Field>
                    <Field label="Kota Domisili">
                      <input
                        className="input-field"
                        value={form.city || ""}
                        onChange={(e) => handleChange("city", e.target.value)}
                        placeholder="Kota"
                      />
                    </Field>
                  </div>
                  <Field label="Bio">
                    <textarea
                      className="input-field h-20 resize-none"
                      value={form.bio || ""}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      placeholder="Bio singkat..."
                      maxLength={300}
                    />
                  </Field>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <input
                      type="checkbox"
                      id="edit_visible"
                      checked={form.is_visible !== false}
                      onChange={(e) =>
                        handleChange("is_visible", e.target.checked)
                      }
                      className="w-4 h-4 accent-blue-600"
                    />
                    <label
                      htmlFor="edit_visible"
                      className="text-sm text-slate-700 cursor-pointer"
                    >
                      Tampilkan profil di direktori alumni
                    </label>
                  </div>
                </>
              )}

              {/* Tab Akademik */}
              {activeTab === "academic" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fakultas" className="col-span-2">
                    <select
                      className="input-field"
                      value={form.faculty || ""}
                      onChange={(e) => handleChange("faculty", e.target.value)}
                    >
                      <option value="">Pilih Fakultas</option>
                      {FACULTY_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Program Studi" className="col-span-2">
                    <input
                      className="input-field"
                      value={form.major || ""}
                      onChange={(e) => handleChange("major", e.target.value)}
                      placeholder="Contoh: Teknik Informatika"
                    />
                  </Field>
                  <Field label="Tahun Lulus">
                    <input
                      type="number"
                      className="input-field"
                      value={form.graduation_year || ""}
                      onChange={(e) =>
                        handleChange(
                          "graduation_year",
                          parseInt(e.target.value) || null,
                        )
                      }
                      placeholder="2020"
                      min="1990"
                      max={currentYear}
                    />
                  </Field>
                  <Field label="IPK">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      className="input-field"
                      value={form.gpa || ""}
                      onChange={(e) =>
                        handleChange("gpa", parseFloat(e.target.value) || null)
                      }
                      placeholder="3.50"
                    />
                  </Field>
                </div>
              )}

              {/* Tab Karir */}
              {activeTab === "career" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status" className="col-span-2">
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
                          onClick={() => handleChange("current_status", key)}
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
                  <Field label="Jabatan">
                    <input
                      className="input-field"
                      value={form.current_job_title || ""}
                      onChange={(e) =>
                        handleChange("current_job_title", e.target.value)
                      }
                      placeholder="Software Engineer"
                    />
                  </Field>
                  <Field label="Perusahaan">
                    <input
                      className="input-field"
                      value={form.current_company || ""}
                      onChange={(e) =>
                        handleChange("current_company", e.target.value)
                      }
                      placeholder="Nama perusahaan"
                    />
                  </Field>
                  <Field label="Bidang Pekerjaan">
                    <input
                      className="input-field"
                      value={form.work_field || ""}
                      onChange={(e) =>
                        handleChange("work_field", e.target.value)
                      }
                      placeholder="Teknologi Informasi"
                    />
                  </Field>
                  <Field label="Kota Bekerja">
                    <input
                      className="input-field"
                      value={form.work_city || ""}
                      onChange={(e) =>
                        handleChange("work_city", e.target.value)
                      }
                      placeholder="Jakarta"
                    />
                  </Field>
                  <Field label="LinkedIn">
                    <input
                      className="input-field"
                      value={form.linkedin_url || ""}
                      onChange={(e) =>
                        handleChange("linkedin_url", e.target.value)
                      }
                      placeholder="https://linkedin.com/in/..."
                    />
                  </Field>
                  <Field label="GitHub">
                    <input
                      className="input-field"
                      value={form.github_url || ""}
                      onChange={(e) =>
                        handleChange("github_url", e.target.value)
                      }
                      placeholder="https://github.com/..."
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <div>
                {saveStatus === "success" && (
                  <span className="text-emerald-600 text-sm font-medium">
                    ✅ {saveMsg}
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="text-red-500 text-sm font-medium">
                    ❌ {saveMsg}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  {saveStatus === "success" ? "Tutup" : "Batal"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary text-sm py-2 px-4"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}
