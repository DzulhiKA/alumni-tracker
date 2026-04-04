"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import type { Profile } from "@/lib/database.types"

interface NavbarProps {
  profile: Profile | null
}

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const isAdmin = profile?.role === "admin"

  const navLinks = isAdmin
    ? [
        { href: "/dashboard", label: "Beranda" },
        { href: "/alumni", label: "Data Alumni" },
        { href: "/admin", label: "Panel Admin" },
        { href: "/admin/statistik", label: "Statistik" },
        { href: "/admin/tracking", label: "🔍 Tracking" },
        { href: "/admin/import", label: "📥 Import" },
      ]
    : [
        { href: "/dashboard", label: "Beranda" },
        { href: "/alumni", label: "Data Alumni" },
        { href: "/dashboard/profile", label: "Profil Saya" },
      ]

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
            </div>
            <span className="font-bold text-slate-800">Alumni Tracker</span>
            {isAdmin && (
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === link.href
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-none">
                {profile?.full_name || "Pengguna"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{profile?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {profile?.full_name?.charAt(0).toUpperCase() || "?"}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-red-500 transition-colors font-medium"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
