import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const maxDuration = 60 // maksimal 60 detik per request

export async function POST(request: Request) {
  try {
    // 1. Verifikasi admin
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(list) {
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

    // 2. Ambil data dari request
    const body = await request.json()
    const { rows, logId } = body as {
      rows: {
        nama_lulusan: string
        nim: string
        tahun_masuk?: number
        tanggal_lulus?: string
        fakultas?: string
        program_studi?: string
      }[]
      logId: string
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Tidak ada data" }, { status: 400 })
    }

    // 3. Gunakan service role untuk insert massal
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // 4. Filter baris valid
    const validRows = rows.filter(
      (r) => r.nama_lulusan?.trim() && r.nim?.trim(),
    )
    if (validRows.length === 0) {
      return NextResponse.json({ imported: 0, skipped: rows.length, errors: 0 })
    }

    // 5. Upsert — jika NIM sudah ada, skip (on_conflict = ignore)
    const payload = validRows.map((r) => ({
      nama_lulusan: r.nama_lulusan.trim(),
      nim: r.nim.trim(),
      tahun_masuk: r.tahun_masuk || null,
      tanggal_lulus: r.tanggal_lulus || null,
      fakultas: r.fakultas?.trim() || null,
      program_studi: r.program_studi?.trim() || null,
    }))

    const { data, error } = await supabaseAdmin
      .from("alumni_records")
      .upsert(payload, {
        onConflict: "nim",
        ignoreDuplicates: true, // skip jika NIM sudah ada
      })
      .select("id")

    const imported = data?.length ?? 0
    const skipped = validRows.length - imported
    const errors = rows.length - validRows.length

    // 6. Update log jika logId diberikan
    if (logId) {
      await supabaseAdmin
        .rpc("increment_import_log", {
          p_log_id: logId,
          p_imported: imported,
          p_skipped: skipped,
          p_errors: errors,
        })
        .catch(() => {}) // ignore jika RPC belum ada
    }

    return NextResponse.json({ imported, skipped, errors })
  } catch (err: any) {
    console.error("Import error:", err)
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    )
  }
}
