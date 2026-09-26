import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Navbar from "@/components/Navbar"
import AlumniDirectoryClient from "@/components/AlumniDirectoryClient"
import type { Profile } from "@/lib/database.types"

// Paksa render dinamis
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AlumniPage() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Ambil semua alumni yang visible
  const { data: allAlumni } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "alumni")
    .eq("is_visible", true)
    .order("graduation_year", { ascending: false })

  const alumniList: Profile[] = allAlumni || []

  // Ekstrak opsi filter unik dari data menggunakan Array.from
  const uniqueFaculties = Array.from(
    new Set(alumniList.map((p) => p.faculty).filter(Boolean)),
  ).sort() as string[]

  const uniqueYears = Array.from(
    new Set(alumniList.map((p) => p.graduation_year).filter(Boolean)),
  ).sort((a, b) => Number(b) - Number(a)) as number[]

  const uniqueCities = Array.from(
    new Set(alumniList.map((p) => p.work_city).filter(Boolean)),
  ).sort() as string[]

  const uniqueFields = Array.from(
    new Set(alumniList.map((p) => p.work_field).filter(Boolean)),
  ).sort() as string[]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar profile={myProfile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AlumniDirectoryClient
          initialAlumni={alumniList}
          currentUserId={user.id}
          faculties={uniqueFaculties}
          years={uniqueYears}
          cities={uniqueCities}
          fields={uniqueFields}
        />
      </main>
    </div>
  )
}
