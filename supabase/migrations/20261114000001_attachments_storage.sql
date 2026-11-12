-- Penyimpanan berkas lampiran tugas (F-12).
-- Sebelum migrasi ini, aplikasi hanya mencatat NAMA berkas tanpa menyimpan isinya.
--
-- Jalankan di Supabase -> SQL Editor, lalu refresh aplikasi.

-- 1. Bucket privat untuk lampiran tugas.
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

-- 2. Bersihkan policy lama agar tidak dobel.
drop policy if exists "task_attachments_read"   on storage.objects;
drop policy if exists "task_attachments_insert" on storage.objects;
drop policy if exists "task_attachments_update" on storage.objects;
drop policy if exists "task_attachments_delete" on storage.objects;

-- 3. Hanya pengguna yang sudah login yang boleh membaca & mengunggah.
create policy "task_attachments_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'task-attachments');

create policy "task_attachments_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'task-attachments');

-- 4. Menghapus hanya boleh oleh pengunggah berkas itu sendiri.
create policy "task_attachments_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'task-attachments' and owner = auth.uid());

notify pgrst, 'reload schema';
