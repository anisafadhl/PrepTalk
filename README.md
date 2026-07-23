# PrepTalk - Simulator Wawancara Kerja Berbasis AI

**PrepTalk** adalah aplikasi web interaktif berbasis AI yang dirancang untuk membantu para kandidat mempersiapkan diri menghadapi wawancara kerja secara real-time. Aplikasi ini mengevaluasi jawaban lisan kandidat menggunakan kecerdasan buatan dan memberikan laporan hasil penilaian (rapor) secara instan.

🌐 **Demo Website**: [https://preptalk-five.vercel.app/](https://preptalk-five.vercel.app/)

---

## 👥 Anggota Kelompok
Proyek ini disusun dan dikembangkan oleh:
* **Go, Vellisa** (NIM: 24.01.53.0006)
* **Anisa Fadhila** (NIM: 24.01.53.0010)
* **Novelyna Fadhila** (NIM: 24.01.53.0032)

---

## 🚀 Fitur Utama

1. **Alur Wawancara Dinamis (5 Tahap)**
   - Wawancara disesuaikan berdasarkan peran pekerjaan yang dipilih (*Software Engineer*, *Digital Marketing*, *UI/UX Designer*).
   - AI mengajukan pertanyaan lanjutan secara cerdas berdasarkan respon jawaban Anda sebelumnya.
2. **Speech-to-Text & Deteksi Filler Words**
   - Merekam suara kandidat langsung melalui mikrofon browser.
   - Mentranskrip audio secara otomatis ke bentuk teks.
   - Menghitung dan mendeteksi penggunaan kata jeda (*filler words*) seperti *"eee"*, *"hmmm"*, *"kayak"*, *"anu"*, dll.
3. **Evaluasi Cerdas (Google Gemini AI)**
   - Menilai 3 parameter utama: **Relevansi Konten**, **Kepercayaan Diri**, dan **Struktur Kalimat**.
   - Memberikan skor keseluruhan (*Overall Score*) dan status kelulusan.
   - Memberikan umpan balik/saran (*feedback*) HRD yang dipersonalisasi.
4. **Integrasi Supabase Cloud**
   - **Supabase Auth**: Pendaftaran, login akun, dan pemulihan kata sandi (*Forgot Password*) secara instan.
   - **Supabase Database**: Menyimpan laporan hasil evaluasi wawancara secara permanen di cloud.
   - **Supabase Storage**: Mengunggah foto profil kustom secara langsung dengan fitur penyunting/pemotong gambar (*Image Cropper*) interaktif.
5. **Desain Antarmuka Premium & Responsif**
   - Menggunakan estetika modern dengan efek glassmorphism, gradasi warna pastel, dan efek bayangan melayang.
   - Mendukung penuh tampilan responsif untuk Desktop, Tablet, maupun Smartphone.
   - Animasi dialog konfirmasi dan notifikasi kustom (*Toast Alert*) untuk seluruh interaksi sistem.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend:** Next.js 16.2.10 (App Router), Vanilla CSS, React Hooks
- **Kecerdasan Buatan:** Google Generative AI SDK (`gemini-2.5-flash`)
- **Database & Auth:** Supabase JS SDK (Database, Auth, Storage)

---

## ⚙️ Persiapan & Instalasi Lokal

### 1. Kloning Proyek
```bash
git clone https://github.com/anisafadhl/PrepTalk.git
cd PrepTalk
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat berkas bernama `.env.local` di root folder proyek, lalu isi dengan konfigurasi berikut:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### 4. Skema Database Supabase
Jalankan perintah SQL berikut di **SQL Editor Supabase** Anda untuk membuat tabel dan trigger profil otomatis:

```sql
-- Tabel Laporan Rapor
create table reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null,
  overall_score integer not null,
  status text not null,
  relevansi_konten integer not null,
  kepercayaan_diri integer not null,
  struktur_kalimat integer not null,
  filler_words_count integer not null,
  filler_words_details jsonb,
  feedback text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabel Profil User
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger Penyalin Profil Otomatis saat Sign Up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    split_part(new.email, '@', 1),
    'User PrepTalk',
    'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

> **Catatan Penting Supabase Storage:**
> Pastikan Anda telah membuat sebuah Storage Bucket baru bernama **`avatars`** di dashboard Supabase Anda, serta mengatur kebijakannya (*Storage Policies*) agar berstatus **Public Read** & **Authenticated Upload**.

### 5. Jalankan Aplikasi
```bash
npm run dev
```
Buka **[http://localhost:3000](http://localhost:3000)** di browser Anda.

---

## 📄 Lisensi
Proyek ini didistribusikan di bawah Lisensi MIT.
