-- Arsip proyek: menandai proyek yang sudah selesai agar tidak memenuhi
-- daftar Scope of Work, tetapi tetap dapat dicari kembali.
--
-- Sebelum migrasi ini, aplikasi menyimpan penanda arsip di localStorage
-- (peramban masing-masing) sehingga fitur tetap bisa dipakai. Setelah migrasi
-- dijalankan, penanda disimpan di basis data dan berlaku untuk semua perangkat.
--
-- AMAN DIJALANKAN BERULANG KALI. Jalankan di Supabase -> SQL Editor.

alter table public.projects
  add column if not exists archived boolean not null default false;

alter table public.projects
  add column if not exists archived_at timestamptz;

create index if not exists projects_archived_idx on public.projects (archived);

notify pgrst, 'reload schema';
