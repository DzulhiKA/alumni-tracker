import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(list: Array<{ name: string; value: string; options?: any }>) {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json(
        { error: "Tidak terautentikasi" },
        { status: 401 },
      )

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (adminProfile?.role !== "admin")
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })

    const { id, data: updateData } = await request.json()
    if (!id)
      return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const payload: Record<string, any> = {}
    const allowedFields = [
      "nama_lulusan",
      "nim",
      "tahun_masuk",
      "tanggal_lulus",
      "fakultas",
      "program_studi",
      "email",
      "no_hp",
      "linkedin_url",
      "instagram_url",
      "facebook_url",
      "tiktok_url",
      "tempat_bekerja",
      "alamat_bekerja",
      "posisi",
      "tipe_pekerjaan",
      "company_website",
      "company_instagram",
      "company_linkedin",
      "search_status",
      "is_verified",
      "is_claimed",
    ]

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        payload[field] = updateData[field] || null
      }
    }

    // Jika ada data sosmed dan search_status belum diset spesifik, update status jadi 'found'
    if (!updateData.search_status) {
      const hasSosmed = [
        "linkedin_url",
        "instagram_url",
        "facebook_url",
        "tiktok_url",
      ].some((f) => payload[f])
      if (hasSosmed) payload.search_status = "found"
    }

    const { error } = await supabaseAdmin
      .from("alumni_records")
      .update(payload)
      .eq("id", id)

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, updated: payload })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
