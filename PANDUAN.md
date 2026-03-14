# 🎓 Alumni Tracker — Panduan Lengkap Setup

## Gambaran Umum Sistem

Website Alumni Tracker ini dibangun dengan:
- **Next.js 14** (App Router)
- **Supabase** (Auth + PostgreSQL + RLS)
- **Tailwind CSS** (styling)
- **TypeScript**

### Fitur Fase 1 (yang sudah dibuat):
| Fitur | Admin | Alumni |
|---|---|---|
| Login / Register | ✅ | ✅ |
| Dashboard beranda + statistik | ✅ | ✅ |
| Direktori alumni (search & filter) | ✅ | ✅ |
| Edit profil lengkap | ✅ | ✅ (profil sendiri) |
| Banner kelengkapan profil | — | ✅ |
| Panel admin (tabel semua alumni) | ✅ | — |
| Toggle visibilitas profil | ✅ | ✅ (profil sendiri) |
| Hapus akun alumni | ✅ | — |

---

## LANGKAH 1 — Setup Proyek Next.js

```bash
# Buat folder proyek & masuk
mkdir alumni-tracker && cd alumni-tracker

# Copy semua file yang sudah disiapkan ke folder ini
# (lihat struktur folder di bawah)

# Install dependencies
npm install
```

### Struktur Folder Lengkap:
```
alumni-tracker/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                    ← redirect ke /dashboard atau /auth/login
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx              ← layout dengan Navbar
│   │   ├── page.tsx                ← halaman beranda alumni
│   │   └── profile/page.tsx        ← halaman edit profil
│   ├── alumni/
│   │   └── page.tsx                ← direktori semua alumni
│   └── admin/
│       ├── layout.tsx
│       ├── page.tsx                ← panel admin
│       └── AdminTable.tsx          ← tabel kelola alumni (client)
├── components/
│   ├── Navbar.tsx
│   └── ProfileCompletionBanner.tsx
├── lib/
│   ├── supabase.ts                 ← client browser + server
│   └── database.types.ts           ← TypeScript types & helpers
├── middleware.ts                   ← proteksi route & role guard
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
├── postcss.config.js
└── .env.local                      ← buat sendiri (lihat Langkah 2)
```

---

## LANGKAH 2 — Setup Supabase

### 2.1 Buat Proyek Supabase

1. Buka [supabase.com](https://supabase.com) → **New Project**
2. Isi nama proyek, pilih region terdekat (misal: Southeast Asia)
3. Catat **Project URL** dan **anon public key** dari:
   `Settings → API → Project URL & Project API keys`

### 2.2 Buat File `.env.local`

Buat file `.env.local` di root proyek:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.3 Jalankan SQL Schema

1. Buka Supabase Dashboard → **SQL Editor**
2. Klik **New query**
3. Copy seluruh isi file `supabase/schema.sql`
4. Klik **Run** (▶)

Schema ini akan membuat:
- Tabel `profiles` (extend `auth.users`)
- Tabel `career_history`
- Trigger auto-buat profil saat register
- View `profile_completeness`
- Semua Row Level Security (RLS) policies

### 2.4 Aktifkan Email Auth

1. Supabase Dashboard → **Authentication → Providers**
2. Pastikan **Email** provider aktif
3. Untuk development, matikan **Confirm email** agar tidak perlu verifikasi:
   `Authentication → Email → Disable email confirmations` → toggle ON

---

## LANGKAH 3 — Jalankan Aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000` → otomatis redirect ke `/auth/login`

---

## LANGKAH 4 — Buat Akun Admin Pertama

### Cara 1: Via SQL Editor (Direkomendasikan)

1. Register akun biasa di `/auth/register` dengan email admin Anda
2. Setelah berhasil, buka Supabase **SQL Editor**
3. Jalankan query:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'email-admin-anda@gmail.com';
```

4. Refresh halaman → menu "Panel Admin" muncul di navbar

### Cara 2: Langsung di Table Editor

1. Supabase Dashboard → **Table Editor → profiles**
2. Cari baris dengan email admin Anda
3. Edit kolom `role` dari `alumni` → `admin`
4. Save

---

## LANGKAH 5 — Alur Penggunaan

### Sebagai Alumni:
1. Register di `/auth/register`
2. Login di `/auth/login`
3. Dashboard menampilkan **banner kuning** jika profil belum lengkap
4. Klik **"Lengkapi"** atau buka menu **"Profil Saya"**
5. Isi 3 tab: Data Pribadi, Data Akademik, Karir & Pekerjaan
6. Simpan → progress bar berubah hijau saat ≥80%

### Sebagai Admin:
1. Login dengan akun yang sudah di-set `role = 'admin'`
2. Navbar menampilkan badge **"Admin"** dan menu **"Panel Admin"**
3. Di Panel Admin bisa:
   - Lihat semua alumni + progress kelengkapan profil
   - Toggle visibilitas profil alumni
   - Hapus akun alumni (double confirm)

---

## LANGKAH 6 — Konfigurasi Tambahan (Opsional)

### 6.1 Upload Foto Profil (Storage)

Tambahkan di Supabase: **Storage → New Bucket → `avatars`** (public)

Lalu tambahkan kode upload di `app/dashboard/profile/page.tsx`:
```typescript
const handleAvatarUpload = async (file: File) => {
  const { data } = await supabase.storage
    .from('avatars')
    .upload(`${user.id}/avatar.jpg`, file, { upsert: true })
  
  const url = supabase.storage.from('avatars').getPublicUrl(data!.path).data.publicUrl
  await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
}
```

### 6.2 Storage Policy untuk Avatars

```sql
-- Di SQL Editor Supabase:
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

### 6.3 Deploy ke Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables di Vercel Dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Rencana Fase 2 (Pengembangan Selanjutnya)

Sesuai use case diagram yang Anda kirim:

| UC | Fitur | Deskripsi |
|---|---|---|
| UC04 | Scheduler | Cron job untuk crawling berkala |
| UC05 | Multi-source query | Generate query ke LinkedIn, GitHub, dll |
| UC06 | Scraping publik | Kumpulkan data dari sumber publik |
| UC07 | Identity extraction | Ekstrak sinyal identitas dari data mentah |
| UC08 | Disambiguation | Skor kepercayaan kecocokan profil |
| UC09 | Cross-source validation | Validasi data dari berbagai sumber |
| UC10 | Status assignment | Auto-tetapkan status alumni |
| UC11 | Evidence trail | Simpan jejak bukti perubahan data |
| UC12 | Manual verification | Admin verifikasi data hasil scraping |
| UC13 | Dashboard laporan | Visualisasi & export data |

---

## Troubleshooting

### Error: "new row violates row-level security"
→ Pastikan RLS policies sudah dijalankan di SQL Editor

### Error: "relation profiles does not exist"
→ Jalankan ulang schema.sql dari awal di SQL Editor

### Tidak bisa login setelah register
→ Matikan email confirmation di:
   `Authentication → Email → Disable email confirmations`

### Halaman admin tidak muncul
→ Pastikan kolom `role` di tabel `profiles` sudah diubah ke `'admin'`

### Middleware redirect loop
→ Cek `.env.local` — pastikan URL dan key sudah benar
