import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // 1. Verifikasi yang request adalah admin
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Tidak terautentikasi" },
        { status: 401 },
      )
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (adminProfile?.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
    }

    // 2. Ambil data dari request body
    const body = await request.json()
    const {
      email,
      password,
      full_name,
      nim,
      faculty,
      major,
      graduation_year,
      phone,
      city,
      current_status,
      current_job_title,
      current_company,
    } = body

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Email, password, dan nama lengkap wajib diisi" },
        { status: 400 },
      )
    }

    // 3. Gunakan service role untuk buat user baru
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // langsung konfirmasi tanpa verifikasi email
        user_metadata: {
          role: "alumni",
          full_name,
          nim,
        },
      })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // 4. Update profil dengan data tambahan
    if (newUser.user) {
      await supabaseAdmin
        .from("profiles")
        .update({
          full_name,
          nim: nim || null,
          phone: phone || null,
          city: city || null,
          faculty: faculty || null,
          major: major || null,
          graduation_year: graduation_year ? Number(graduation_year) : null,
          current_status: current_status || null,
          current_job_title: current_job_title || null,
          current_company: current_company || null,
        })
        .eq("id", newUser.user.id)
    }

    return NextResponse.json({
      success: true,
      message: `Akun alumni ${full_name} berhasil dibuat`,
      userId: newUser.user?.id,
    })
  } catch (err) {
    console.error("Create alumni error:", err)
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    )
  }
}
