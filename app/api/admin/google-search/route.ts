import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const maxDuration = 30

async function serpSearch(query: string): Promise<{
  linkedin?: string
  instagram?: string
  facebook?: string
  tiktok?: string
  raw: any[]
}> {
  const apiKey = process.env.SERP_API_KEY
  if (!apiKey) throw new Error("SERP_API_KEY belum diset")

  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=10`
  const res = await fetch(url)

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error || "SerpAPI error")
  }

  const data = await res.json()
  const items = data.organic_results || []

  const result = {
    linkedin: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    raw: items,
  }

  for (const item of items) {
    const link: string = item.link || ""
    if (!result.linkedin && link.includes("linkedin.com/in/"))
      result.linkedin = link
    if (!result.instagram && link.includes("instagram.com/"))
      result.instagram = link
    if (!result.facebook && link.includes("facebook.com/"))
      result.facebook = link
    if (!result.tiktok && link.includes("tiktok.com/@")) result.tiktok = link
  }

  return result
}

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

    const { recordId, nama, nim } = await request.json()
    if (!recordId || !nama)
      return NextResponse.json(
        { error: "recordId dan nama wajib" },
        { status: 400 },
      )

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    await supabaseAdmin
      .from("alumni_records")
      .update({
        search_status: "searching",
        last_searched_at: new Date().toISOString(),
      })
      .eq("id", recordId)

    const query = nim
      ? `"${nama}" "${nim}" site:linkedin.com OR site:instagram.com OR site:facebook.com`
      : `"${nama}" alumni site:linkedin.com OR site:instagram.com OR site:facebook.com`

    const results = await serpSearch(query)

    const found = !!(
      results.linkedin ||
      results.instagram ||
      results.facebook ||
      results.tiktok
    )

    const updateData: Record<string, any> = {
      search_status: found ? "found" : "not_found",
      last_searched_at: new Date().toISOString(),
      search_results: results.raw,
    }

    if (
      results.linkedin &&
      !(await hasValue(supabaseAdmin, recordId, "linkedin_url"))
    )
      updateData.linkedin_url = results.linkedin
    if (
      results.instagram &&
      !(await hasValue(supabaseAdmin, recordId, "instagram_url"))
    )
      updateData.instagram_url = results.instagram
    if (
      results.facebook &&
      !(await hasValue(supabaseAdmin, recordId, "facebook_url"))
    )
      updateData.facebook_url = results.facebook
    if (
      results.tiktok &&
      !(await hasValue(supabaseAdmin, recordId, "tiktok_url"))
    )
      updateData.tiktok_url = results.tiktok

    await supabaseAdmin
      .from("alumni_records")
      .update(updateData)
      .eq("id", recordId)

    return NextResponse.json({
      success: true,
      found,
      linkedin: results.linkedin || null,
      instagram: results.instagram || null,
      facebook: results.facebook || null,
      tiktok: results.tiktok || null,
    })
  } catch (err: any) {
    console.error("SerpAPI search error:", err)
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    )
  }
}

async function hasValue(
  client: any,
  id: string,
  field: string,
): Promise<boolean> {
  const { data } = await client
    .from("alumni_records")
    .select(field)
    .eq("id", id)
    .single()
  return !!data?.[field]
}
