-- =============================================
-- ALUMNI TRACKER - Supabase Schema
-- =============================================

-- 1. Tabel profiles (extend auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'alumni' CHECK (role IN ('admin', 'alumni')),
  
  -- Data Pribadi
  full_name TEXT,
  nim TEXT UNIQUE,                     -- Nomor Induk Mahasiswa
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  address TEXT,
  city TEXT,
  
  -- Data Akademik
  faculty TEXT,                        -- Fakultas
  major TEXT,                          -- Program Studi
  graduation_year INTEGER,             -- Tahun Lulus
  gpa NUMERIC(3,2),                    -- IPK
  
  -- Data Karir
  current_status TEXT CHECK (current_status IN ('employed', 'self_employed', 'studying', 'unemployed', 'other')),
  current_job_title TEXT,
  current_company TEXT,
  work_field TEXT,                     -- Bidang Pekerjaan
  work_city TEXT,
  
  -- Sosial Media (untuk fase selanjutnya)
  linkedin_url TEXT,
  github_url TEXT,
  
  -- Meta
  bio TEXT,
  is_visible BOOLEAN DEFAULT true,     -- Apakah profil bisa dilihat alumni lain
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel untuk riwayat karir alumni
CREATE TABLE public.career_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  start_year INTEGER,
  end_year INTEGER,
  is_current BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trigger: auto-insert profile saat user baru register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'alumni')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Trigger: update updated_at otomatis
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_history ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
-- Alumni bisa lihat semua profil yang visible
CREATE POLICY "Alumni can view visible profiles"
  ON public.profiles FOR SELECT
  USING (
    is_visible = true
    OR auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User bisa update profil sendiri
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin bisa update semua profil
CREATE POLICY "Admin can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin bisa delete profil
CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- CAREER HISTORY policies
CREATE POLICY "Anyone can view career history"
  ON public.career_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = career_history.profile_id AND is_visible = true
    )
    OR profile_id = auth.uid()
  );

CREATE POLICY "Users can manage own career history"
  ON public.career_history FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admin can manage all career history"
  ON public.career_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View: profile completeness score
CREATE OR REPLACE VIEW public.profile_completeness AS
SELECT
  id,
  full_name,
  (
    (CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 ELSE 0 END) +
    (CASE WHEN nim IS NOT NULL AND nim != '' THEN 1 ELSE 0 END) +
    (CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END) +
    (CASE WHEN avatar_url IS NOT NULL AND avatar_url != '' THEN 1 ELSE 0 END) +
    (CASE WHEN date_of_birth IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN faculty IS NOT NULL AND faculty != '' THEN 1 ELSE 0 END) +
    (CASE WHEN major IS NOT NULL AND major != '' THEN 1 ELSE 0 END) +
    (CASE WHEN graduation_year IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN current_status IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN current_job_title IS NOT NULL AND current_job_title != '' THEN 1 ELSE 0 END)
  ) * 10 AS completeness_percent,
  role,
  updated_at
FROM public.profiles;

-- =============================================
-- SEED DATA: Buat akun admin pertama
-- (Jalankan ini SETELAH register akun admin via UI,
--  ganti email sesuai akun Anda)
-- =============================================
-- UPDATE public.profiles SET role = 'admin'
-- WHERE email = 'admin@example.com';
