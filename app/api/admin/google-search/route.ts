import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const maxDuration = 45

interface SearchResult {
  linkedin?: string
  instagram?: string
  facebook?: string
  tiktok?: string
  tempat_bekerja?: string
  posisi?: string
  raw: any[]
}

// 1. SerpAPI search
async function searchViaSerpApi(query: string, apiKey: string): Promise<SearchResult> {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${apiKey}&num=10`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error || `SerpAPI HTTP ${res.status}`)
  }
  const data = await res.json()
  const items = data.organic_results || []
  return extractSocialsFromItems(items.map((i: any) => ({ link: i.link, snippet: i.snippet, title: i.title })))
}

// 2. Google Custom Search API
async function searchViaGoogleCse(query: string, apiKey: string, cx: string): Promise<SearchResult> {
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=10`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Google CSE HTTP ${res.status}`)
  }
  const data = await res.json()
  const items = data.items || []
  return extractSocialsFromItems(items.map((i: any) => ({ link: i.link, snippet: i.snippet, title: i.title })))
}

// 3. Fallback DuckDuckGo HTML Search
async function searchViaDuckDuckGo(query: string): Promise<SearchResult> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
  })
  if (!res.ok) {
    return { raw: [] }
  }
  const html = await res.text()
  const linkRegex = /uddg=([^&"]+)/g
  const links: string[] = []
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const decoded = decodeURIComponent(match[1])
      if (decoded.startsWith("http")) links.push(decoded)
    } catch {}
  }
  return extractSocialsFromItems(links.map((link) => ({ link, snippet: "", title: "" })))
}

function extractSocialsFromItems(items: Array<{ link?: string; snippet?: string; title?: string }>): SearchResult {
  const result: SearchResult = {
    linkedin: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    tempat_bekerja: "",
    posisi: "",
    raw: items,
  }

  for (const item of items) {
    const link = item.link || ""
    if (!result.linkedin && link.includes("linkedin.com/in/")) {
      result.linkedin = link.split("?")[0]
    }
    if (!result.instagram && link.includes("instagram.com/")) {
      const clean = link.split("?")[0]
      if (!clean.includes("/p/") && !clean.includes("/reel/") && !clean.includes("/stories/")) {
        result.instagram = clean
      }
    }
    if (!result.facebook && link.includes("facebook.com/")) {
      const clean = link.split("?")[0]
      if (!clean.includes("/sharer") && !clean.includes("/story")) {
        result.facebook = clean
      }
    }
    if (!result.tiktok && link.includes("tiktok.com/@")) {
      result.tiktok = link.split("?")[0]
    }
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

    const { recordId, nama, nim, prodi, fakultas } = await request.json()
    if (!recordId || !nama)
      return NextResponse.json(
        { error: "recordId dan nama wajib diisi" },
        { status: 400 },
      )

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Set status searching
    await supabaseAdmin
      .from("alumni_records")
      .update({
        search_status: "searching",
        last_searched_at: new Date().toISOString(),
      })
      .eq("id", recordId)

    const queryParts = [`"${nama.trim()}"`]
    if (prodi) queryParts.push(`"${prodi.trim()}"`)
    else if (fakultas) queryParts.push(`"${fakultas.trim()}"`)
    queryParts.push("(site:linkedin.com/in/ OR site:instagram.com OR site:facebook.com)")

    const query = queryParts.join(" ")

    let results: SearchResult = { raw: [] }
    let searchEngineUsed = "duckduckgo"

    const serpKey = process.env.SERP_API_KEY
    const googleKey = process.env.GOOGLE_API_KEY
    const googleCx = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CX

    if (serpKey) {
      try {
        results = await searchViaSerpApi(query, serpKey)
        searchEngineUsed = "serpapi"
      } catch (e: any) {
        console.warn("SerpAPI gagal, mencoba fallback:", e.message)
      }
    }

    if (!results.linkedin && !results.instagram && googleKey && googleCx) {
      try {
        results = await searchViaGoogleCse(query, googleKey, googleCx)
        searchEngineUsed = "google_cse"
      } catch (e: any) {
        console.warn("Google CSE gagal, mencoba fallback:", e.message)
      }
    }

    if (!results.linkedin && !results.instagram) {
      try {
        results = await searchViaDuckDuckGo(query)
      } catch (e: any) {
        console.warn("DuckDuckGo search fallback gagal:", e.message)
      }
    }

    const found = !!(
      results.linkedin ||
      results.instagram ||
      results.facebook ||
      results.tiktok
    )

    // Ambil data existing record
    const { data: existing } = await supabaseAdmin
      .from("alumni_records")
      .select("linkedin_url, instagram_url, facebook_url, tiktok_url")
      .eq("id", recordId)
      .single()

    const updateData: Record<string, any> = {
      search_status: found ? "found" : "not_found",
      last_searched_at: new Date().toISOString(),
    }

    if (results.linkedin && !existing?.linkedin_url) updateData.linkedin_url = results.linkedin
    if (results.instagram && !existing?.instagram_url) updateData.instagram_url = results.instagram
    if (results.facebook && !existing?.facebook_url) updateData.facebook_url = results.facebook
    if (results.tiktok && !existing?.tiktok_url) updateData.tiktok_url = results.tiktok

    await supabaseAdmin
      .from("alumni_records")
      .update(updateData)
      .eq("id", recordId)

    return NextResponse.json({
      success: true,
      found,
      engine: searchEngineUsed,
      linkedin: updateData.linkedin_url || existing?.linkedin_url || null,
      instagram: updateData.instagram_url || existing?.instagram_url || null,
      facebook: updateData.facebook_url || existing?.facebook_url || null,
      tiktok: updateData.tiktok_url || existing?.tiktok_url || null,
    })
  } catch (err: any) {
    console.error("Auto tracking search error:", err)
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 },
    )
  }
}
