'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    nim: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Password dan konfirmasi password tidak sama.')
      return
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Kirim full_name dan nim lewat metadata
    // sehingga trigger handle_new_user bisa langsung menyimpannya
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: 'alumni',
          full_name: form.full_name,
          nim: form.nim,
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Jika email confirmation dimatikan, user langsung ter-autentikasi
    // Kita update profil sekarang karena session sudah ada
    if (data.session && data.user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          nim: form.nim,
        })
        .eq('id', data.user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
      }

      // Langsung redirect ke dashboard
      router.push('/dashboard')
      router.refresh()
      return
    }

    // Jika email confirmation aktif, tampilkan pesan sukses
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 p-4">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-400/30">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Pendaftaran Berhasil!</h2>
          <p className="text-blue-200 mb-6">
            Cek email Anda untuk verifikasi akun, lalu login untuk melengkapi profil.
          </p>
          <Link href="/auth/login" className="inline-block bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-all">
            Ke Halaman Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4 border border-white/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Daftar Alumni</h1>
          <p className="text-blue-200 mt-1">Buat akun baru</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {[
              { name: 'full_name', label: 'Nama Lengkap', type: 'text', placeholder: 'Masukkan nama lengkap' },
              { name: 'nim', label: 'NIM', type: 'text', placeholder: 'Nomor Induk Mahasiswa' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'nama@email.com' },
              { name: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 karakter' },
              { name: 'confirmPassword', label: 'Konfirmasi Password', type: 'password', placeholder: 'Ulangi password' },
            ].map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-blue-100 mb-1.5">{field.label}</label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 
                             text-white placeholder-blue-300 focus:outline-none focus:ring-2 
                             focus:ring-blue-400 focus:border-transparent transition-all"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold 
                         py-3 rounded-xl transition-all duration-200 disabled:opacity-50 
                         disabled:cursor-not-allowed active:scale-95 mt-2"
            >
              {loading ? 'Mendaftarkan...' : 'Daftar'}
            </button>
          </form>

          <p className="text-center text-blue-200 text-sm mt-6">
            Sudah punya akun?{' '}
            <Link href="/auth/login" className="text-white font-semibold hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
