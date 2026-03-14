"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"
import {
  calcProfileCompleteness,
  STATUS_LABELS,
  FACULTY_OPTIONS,
} from "@/lib/database.types"
import type { Profile, CurrentStatus } from "@/lib/database.types"

export default function ProfilePage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  )
  const [saveMsg, setSaveMsg] = useState("")
  const [activeTab, setActiveTab] = useState<
    "personal" | "academic" | "career"
  >("personal")

  // State untuk upload foto
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error) console.error("Profile load error:", error)

      if (data) {
        setProfile(data)
        if (data.avatar_url) {
          setAvatarPreview(data.avatar_url)
          setImgError(false)
        }
      } else {
        setProfile({
          id: user.id,
          email: user.email,
          role: "alumni",
          is_visible: true,
        })
      }

      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleChange = (
    field: keyof Profile,
    value: string | number | boolean | null,
  ) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setSaveStatus("idle")
  }

  // =============================================
  // HANDLE UPLOAD FOTO
  // =============================================
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    // Validasi ukuran (max 2MB) dan tipe
    if (file.size > 2 * 1024 * 1024) {
      setSaveStatus("error")
      setSaveMsg("Ukuran foto maksimal 2MB")
      return
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSaveStatus("error")
      setSaveMsg("Format foto harus JPG, PNG, atau WebP")
      return
    }

    // Tampilkan preview lokal dulu
    const localPreview = URL.createObjectURL(file)
    setAvatarPreview(localPreview)
    setAvatarUploading(true)
    setSaveStatus("idle")

    // Upload ke Supabase Storage
    const ext = file.name.split(".").pop()
    const filePath = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      setSaveStatus("error")
      setSaveMsg(`Gagal upload foto: ${uploadError.message}`)
      setAvatarUploading(false)
      return
    }

    // Ambil public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath)

    // Simpan URL bersih ke DB (tanpa timestamp)
    const avatarUrl = publicUrl

    // Simpan URL ke profil
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId)

    if (updateError) {
      console.error("Avatar url save error:", updateError)
      setSaveStatus("error")
      setSaveMsg(`Foto terupload tapi gagal disimpan: ${updateError.message}`)
    } else {
      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }))
      // Tampilkan dengan timestamp hanya untuk force refresh di browser
      setAvatarPreview(`${avatarUrl}?v=${Date.now()}`)
      setSaveStatus("success")
      setSaveMsg("Foto profil berhasil diperbarui!")
    }

    setAvatarUploading(false)
  }

  const handleSave = async () => {
    if (!userId) {
      setSaveStatus("error")
      setSaveMsg("Sesi tidak ditemukan. Silakan login ulang.")
      return
    }

    setSaving(true)
    setSaveStatus("idle")

    const payload = {
      full_name: profile.full_name || null,
      nim: profile.nim || null,
      phone: profile.phone || null,
      gender: profile.gender || null,
      date_of_birth: profile.date_of_birth || null,
      address: profile.address || null,
      city: profile.city || null,
      faculty: profile.faculty || null,
      major: profile.major || null,
      graduation_year: profile.graduation_year || null,
      gpa: profile.gpa || null,
      current_status: profile.current_status || null,
      current_job_title: profile.current_job_title || null,
      current_company: profile.current_company || null,
      work_field: profile.work_field || null,
      work_city: profile.work_city || null,
      linkedin_url: profile.linkedin_url || null,
      github_url: profile.github_url || null,
      bio: profile.bio || null,
      is_visible: profile.is_visible !== false,
    }

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select()
      .single()

    if (updateError) {
      const { data: upserted, error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          email: profile.email,
          role: "alumni",
          ...payload,
        })
        .select()
        .single()

      if (upsertError) {
        setSaveStatus("error")
        setSaveMsg(`Gagal menyimpan: ${upsertError.message}`)
        setSaving(false)
        return
      }
      if (upserted) setProfile(upserted)
    } else {
      if (updated) setProfile(updated)
    }

    setSaveStatus("success")
    setSaveMsg("Profil berhasil disimpan!")
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const completeness = calcProfileCompleteness(profile)
  const tabs = [
    { key: "personal", label: "Data Pribadi", icon: "👤" },
    { key: "academic", label: "Data Akademik", icon: "🎓" },
    { key: "career", label: "Karir & Pekerjaan", icon: "💼" },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Profil Saya</h1>
        <p className="text-slate-500 mt-0.5">
          Kelola informasi profil alumni Anda
        </p>
      </div>

      {/* ===================== FOTO PROFIL ===================== */}
      <div className="card p-6">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-4">
          Foto Profil
        </h3>
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              {avatarPreview && !imgError ? (
                <img
                  src={avatarPreview}
                  alt="Foto profil"
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                  onLoad={() => setImgError(false)}
                />
              ) : (
                <span className="text-white font-bold text-3xl">
                  {profile.full_name?.charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>
            {/* Loading overlay saat upload */}
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Info & tombol upload */}
          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-3">
              Upload foto profil Anda. Format JPG, PNG, atau WebP, maksimal{" "}
              <strong>2MB</strong>.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="btn-secondary text-sm py-2 px-4 disabled:opacity-50"
              >
                {avatarUploading
                  ? "Mengupload..."
                  : avatarPreview
                    ? "🔄 Ganti Foto"
                    : "📷 Upload Foto"}
              </button>
              {avatarPreview && !avatarUploading && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!userId) return
                    await supabase
                      .from("profiles")
                      .update({ avatar_url: null })
                      .eq("id", userId)
                    setAvatarPreview(null)
                    setProfile((prev) => ({ ...prev, avatar_url: null }))
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-all"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-700">
            Kelengkapan Profil
          </span>
          <span
            className={`font-bold text-lg ${completeness >= 80 ? "text-emerald-600" : completeness >= 50 ? "text-amber-600" : "text-red-500"}`}
          >
            {completeness}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${completeness >= 80 ? "bg-emerald-500" : completeness >= 50 ? "bg-amber-500" : "bg-red-400"}`}
            style={{ width: `${completeness}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {completeness < 80
            ? "Lengkapi profil Anda untuk meningkatkan visibilitas"
            : "✨ Profil Anda sudah cukup lengkap!"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="card p-6 space-y-5">
        {activeTab === "personal" && (
          <>
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
              Data Pribadi
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Nama Lengkap *">
                <input
                  className="input-field"
                  value={profile.full_name || ""}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  placeholder="Nama lengkap sesuai ijazah"
                />
              </FormField>
              <FormField label="NIM *">
                <input
                  className="input-field"
                  value={profile.nim || ""}
                  onChange={(e) => handleChange("nim", e.target.value)}
                  placeholder="Nomor Induk Mahasiswa"
                />
              </FormField>
              <FormField label="No. Telepon">
                <input
                  className="input-field"
                  value={profile.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </FormField>
              <FormField label="Jenis Kelamin">
                <select
                  className="input-field"
                  value={profile.gender || ""}
                  onChange={(e) =>
                    handleChange("gender", e.target.value || null)
                  }
                >
                  <option value="">Pilih</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </FormField>
              <FormField label="Tanggal Lahir">
                <input
                  type="date"
                  className="input-field"
                  value={profile.date_of_birth || ""}
                  onChange={(e) =>
                    handleChange("date_of_birth", e.target.value)
                  }
                />
              </FormField>
              <FormField label="Kota Domisili">
                <input
                  className="input-field"
                  value={profile.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Kota tempat tinggal saat ini"
                />
              </FormField>
            </div>
            <FormField label="Alamat">
              <textarea
                className="input-field h-20 resize-none"
                value={profile.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Alamat lengkap"
              />
            </FormField>
            <FormField label="Bio Singkat">
              <textarea
                className="input-field h-24 resize-none"
                value={profile.bio || ""}
                onChange={(e) => handleChange("bio", e.target.value)}
                placeholder="Ceritakan sedikit tentang diri Anda..."
                maxLength={300}
              />
              <p className="text-xs text-slate-400 mt-1">
                {(profile.bio || "").length}/300
              </p>
            </FormField>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                id="is_visible"
                checked={profile.is_visible !== false}
                onChange={(e) => handleChange("is_visible", e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="is_visible" className="text-sm text-slate-700">
                Tampilkan profil saya di direktori alumni
              </label>
            </div>
          </>
        )}

        {activeTab === "academic" && (
          <>
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
              Data Akademik
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Fakultas *">
                <select
                  className="input-field"
                  value={profile.faculty || ""}
                  onChange={(e) => handleChange("faculty", e.target.value)}
                >
                  <option value="">Pilih Fakultas</option>
                  {FACULTY_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Program Studi *">
                <input
                  className="input-field"
                  value={profile.major || ""}
                  onChange={(e) => handleChange("major", e.target.value)}
                  placeholder="Contoh: Teknik Informatika"
                />
              </FormField>
              <FormField label="Tahun Lulus *">
                <input
                  type="number"
                  className="input-field"
                  value={profile.graduation_year || ""}
                  onChange={(e) =>
                    handleChange(
                      "graduation_year",
                      parseInt(e.target.value) || null,
                    )
                  }
                  placeholder="2020"
                  min="1990"
                  max={new Date().getFullYear()}
                />
              </FormField>
              <FormField label="IPK">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  className="input-field"
                  value={profile.gpa || ""}
                  onChange={(e) =>
                    handleChange("gpa", parseFloat(e.target.value) || null)
                  }
                  placeholder="3.50"
                />
              </FormField>
            </div>
          </>
        )}

        {activeTab === "career" && (
          <>
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
              Karir & Pekerjaan
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Status Saat Ini *" className="sm:col-span-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    Object.entries(STATUS_LABELS) as [CurrentStatus, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleChange("current_status", key)}
                      className={`py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${profile.current_status === key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField label="Jabatan / Posisi">
                <input
                  className="input-field"
                  value={profile.current_job_title || ""}
                  onChange={(e) =>
                    handleChange("current_job_title", e.target.value)
                  }
                  placeholder="Contoh: Software Engineer"
                />
              </FormField>
              <FormField label="Perusahaan / Institusi">
                <input
                  className="input-field"
                  value={profile.current_company || ""}
                  onChange={(e) =>
                    handleChange("current_company", e.target.value)
                  }
                  placeholder="Nama perusahaan"
                />
              </FormField>
              <FormField label="Bidang Pekerjaan">
                <input
                  className="input-field"
                  value={profile.work_field || ""}
                  onChange={(e) => handleChange("work_field", e.target.value)}
                  placeholder="Contoh: Teknologi Informasi"
                />
              </FormField>
              <FormField label="Kota Bekerja">
                <input
                  className="input-field"
                  value={profile.work_city || ""}
                  onChange={(e) => handleChange("work_city", e.target.value)}
                  placeholder="Kota/negara tempat bekerja"
                />
              </FormField>
              <FormField label="LinkedIn">
                <input
                  className="input-field"
                  value={profile.linkedin_url || ""}
                  onChange={(e) => handleChange("linkedin_url", e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </FormField>
              <FormField label="GitHub">
                <input
                  className="input-field"
                  value={profile.github_url || ""}
                  onChange={(e) => handleChange("github_url", e.target.value)}
                  placeholder="https://github.com/..."
                />
              </FormField>
            </div>
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between gap-4">
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
        <button
          onClick={handleSave}
          disabled={saving || !userId}
          className="btn-primary ml-auto"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  )
}

function FormField({
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
