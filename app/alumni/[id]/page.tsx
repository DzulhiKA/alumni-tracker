import { createServerSupabaseClient } from "@/lib/supabase-server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Navbar from "@/components/Navbar"
import { STATUS_LABELS } from "@/lib/database.types"
import type { CurrentStatus } from "@/lib/database.types"

interface PageProps {
  params: { id: string }
}

export default async function AlumniDetailPage({ params }: PageProps) {
  const { id } = params
  const supabase = createServerSupabaseClient()

  // Cek user login
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Ambil profil user yang sedang login (untuk navbar)
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Ambil profil alumni yang ingin dilihat
  const { data: alumni } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "alumni")
    .single()

  // Kalau tidak ditemukan atau profil disembunyikan
  // (kecuali yang lihat adalah diri sendiri atau admin)
  if (!alumni) notFound()
  const isAdmin = myProfile?.role === "admin"
  const isMe = user.id === id
  if (!alumni.is_visible && !isAdmin && !isMe) notFound()

  // Ambil riwayat karir
  const { data: careerHistory } = await supabase
    .from("career_history")
    .select("*")
    .eq("profile_id", id)
    .order("is_current", { ascending: false })
    .order("start_year", { ascending: false })

  const statusBadge: Record<string, string> = {
    employed: "badge-employed",
    studying: "badge-studying",
    self_employed: "badge-self_employed",
    unemployed: "badge-unemployed",
    other: "badge-other",
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={myProfile} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tombol kembali */}
        <Link
          href="/alumni"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          ← Kembali ke Direktori Alumni
        </Link>

        <div className="space-y-6">
          {/* ===== HEADER PROFIL ===== */}
          <div className="card p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Foto */}
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-4xl flex-shrink-0">
                {alumni.avatar_url ? (
                  <img
                    src={alumni.avatar_url}
                    alt={alumni.full_name || ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {alumni.full_name?.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>

              {/* Info utama */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                      {alumni.full_name || (
                        <span className="text-slate-400 italic">
                          Nama belum diisi
                        </span>
                      )}
                    </h1>
                    <p className="text-slate-500 mt-0.5">
                      NIM: {alumni.nim || "-"}
                    </p>
                  </div>

                  {/* Badge status */}
                  {alumni.current_status && (
                    <span
                      className={`text-sm font-semibold px-3 py-1.5 rounded-full flex-shrink-0 ${statusBadge[alumni.current_status] || "bg-slate-100 text-slate-600"}`}
                    >
                      {STATUS_LABELS[alumni.current_status as CurrentStatus]}
                    </span>
                  )}
                </div>

                {/* Pekerjaan saat ini */}
                {(alumni.current_job_title || alumni.current_company) && (
                  <p className="mt-2 text-slate-700 font-medium">
                    💼{" "}
                    {[alumni.current_job_title, alumni.current_company]
                      .filter(Boolean)
                      .join(" di ")}
                  </p>
                )}

                {/* Lokasi */}
                {alumni.work_city && (
                  <p className="text-slate-500 text-sm mt-1">
                    📍 {alumni.work_city}
                  </p>
                )}

                {/* Bio */}
                {alumni.bio && (
                  <p className="mt-3 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
                    {alumni.bio}
                  </p>
                )}

                {/* Sosmed */}
                <div className="flex gap-3 mt-4 flex-wrap">
                  {alumni.linkedin_url && (
                    <a
                      href={alumni.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                    >
                      🔗 LinkedIn
                    </a>
                  )}
                  {alumni.github_url && (
                    <a
                      href={alumni.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
                    >
                      💻 GitHub
                    </a>
                  )}
                  {isMe && (
                    <Link
                      href="/dashboard/profile"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all ml-auto"
                    >
                      ✏️ Edit Profil Saya
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== GRID INFO ===== */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Data Akademik */}
            <div className="card p-6">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                🎓 Data Akademik
              </h2>
              <div className="space-y-3">
                <InfoRow label="Fakultas" value={alumni.faculty} />
                <InfoRow label="Program Studi" value={alumni.major} />
                <InfoRow
                  label="Tahun Lulus"
                  value={
                    alumni.graduation_year
                      ? String(alumni.graduation_year)
                      : null
                  }
                />
                <InfoRow
                  label="IPK"
                  value={alumni.gpa ? alumni.gpa.toFixed(2) : null}
                />
              </div>
            </div>

            {/* Data Pribadi */}
            <div className="card p-6">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                👤 Data Pribadi
              </h2>
              <div className="space-y-3">
                <InfoRow label="Kota Domisili" value={alumni.city} />
                <InfoRow
                  label="Jenis Kelamin"
                  value={
                    alumni.gender === "male"
                      ? "Laki-laki"
                      : alumni.gender === "female"
                        ? "Perempuan"
                        : null
                  }
                />
                <InfoRow label="Bidang Pekerjaan" value={alumni.work_field} />
                <InfoRow
                  label="Kontak"
                  value={alumni.phone}
                  // Hanya tampilkan nomor HP ke diri sendiri atau admin
                  hidden={!isMe && !isAdmin}
                />
              </div>
            </div>
          </div>

          {/* ===== RIWAYAT KARIR ===== */}
          {careerHistory && careerHistory.length > 0 && (
            <div className="card p-6">
              <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
                📋 Riwayat Karir
              </h2>
              <div className="relative">
                {/* Garis timeline */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />

                <div className="space-y-5">
                  {careerHistory.map((career) => (
                    <div key={career.id} className="flex gap-5 pl-12 relative">
                      {/* Dot timeline */}
                      <div
                        className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 border-white ${career.is_current ? "bg-blue-500" : "bg-slate-300"}`}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {career.job_title}
                            </p>
                            <p className="text-sm text-slate-600">
                              {career.company}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-slate-400">
                              {career.start_year}
                              {career.is_current
                                ? " — Sekarang"
                                : career.end_year
                                  ? ` — ${career.end_year}`
                                  : ""}
                            </p>
                            {career.is_current && (
                              <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                                Saat ini
                              </span>
                            )}
                          </div>
                        </div>
                        {career.description && (
                          <p className="text-sm text-slate-500 mt-1">
                            {career.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Kalau tidak ada riwayat karir */}
          {(!careerHistory || careerHistory.length === 0) && (
            <div className="card p-6">
              <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                📋 Riwayat Karir
              </h2>
              <p className="text-slate-400 text-sm italic">
                Belum ada riwayat karir yang ditambahkan.
                {isMe && (
                  <Link
                    href="/dashboard/profile"
                    className="text-blue-600 hover:underline ml-1"
                  >
                    Tambahkan sekarang →
                  </Link>
                )}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function InfoRow({
  label,
  value,
  hidden,
}: {
  label: string
  value: string | null | undefined
  hidden?: boolean
}) {
  if (hidden) return null
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-700 text-right">
        {value || <span className="text-slate-300 font-normal italic">-</span>}
      </span>
    </div>
  )
}
