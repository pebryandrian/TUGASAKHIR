-- Lampiran berupa TAUTAN (mis. Google Drive) — kolom Files pada Main Table.
--
-- Sebelum migrasi ini, tabel `attachments` hanya bisa mencatat berkas yang
-- diunggah ke Supabase Storage (`storage_path`). Supaya tautan Drive juga bisa
-- disimpan, ditambahkan kolom `url`, dan `storage_path` dibuat boleh kosong.
--
-- Catatan kompatibilitas: aplikasi mendeteksi ada/tidaknya kolom `url`. Bila
-- migrasi ini belum dijalankan, tautan tetap bisa disimpan dengan menuliskannya
-- ke `storage_path` berawalan `link:` sehingga fitur tidak mati. Setelah migrasi
-- dijalankan, tautan otomatis memakai kolom `url` yang benar.
--
-- AMAN DIJALANKAN BERULANG KALI. Jalankan di Supabase -> SQL Editor.

alter table public.attachments
  add column if not exists url text;

-- Lampiran berupa tautan tidak punya berkas di Storage.
alter table public.attachments
  alter column storage_path drop not null;

-- Minimal salah satu harus terisi: berkas atau tautan.
alter table public.attachments
  drop constraint if exists attachments_target_check;

alter table public.attachments
  add constraint attachments_target_check
  check (storage_path is not null or url is not null);

-- Pindahkan tautan mode kompatibilitas (`link:https://...`) ke kolom `url`.
update public.attachments
set url = substring(storage_path from 6),
    storage_path = null
where storage_path like 'link:%'
  and url is null;

create index if not exists attachments_task_idx on public.attachments (task_id);

notify pgrst, 'reload schema';
