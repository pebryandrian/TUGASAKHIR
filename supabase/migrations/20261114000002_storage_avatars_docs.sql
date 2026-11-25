-- Bucket penyimpanan berkas sesuai laporan (Subbab 4.2.1):
-- "Supabase Storage untuk foto profil, lampiran tugas, dan gambar dokumen".
--
-- Bucket `task-attachments` sudah dibuat oleh migrasi 20261114000001.
-- Migrasi ini menambahkan `avatars` dan `project-docs`.
--
-- Jalankan di Supabase -> SQL Editor, lalu refresh aplikasi.

-- ---------------------------------------------------------------------------
-- 1. Foto profil — publik agar bisa ditampilkan langsung lewat URL.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read"   on storage.objects;
drop policy if exists "avatars_insert" on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
drop policy if exists "avatars_delete" on storage.objects;

create policy "avatars_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Pengguna hanya boleh menulis ke folder miliknya sendiri: <user_id>/...
create policy "avatars_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 2. Berkas dokumen proyek (gambar & lampiran blok Doc) — privat, diakses
--    lewat signed URL.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-docs', 'project-docs', false)
on conflict (id) do nothing;

drop policy if exists "project_docs_read"   on storage.objects;
drop policy if exists "project_docs_insert" on storage.objects;
drop policy if exists "project_docs_delete" on storage.objects;

create policy "project_docs_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'project-docs');

create policy "project_docs_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-docs');

create policy "project_docs_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-docs' and owner = auth.uid());

notify pgrst, 'reload schema';
