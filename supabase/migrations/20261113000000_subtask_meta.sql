-- Kolom meta subtask: assignee, status, tenggat, dan prioritas.
-- Sebelum migrasi ini dijalankan, sel-sel tersebut di Main Table tidak bisa
-- menyimpan perubahan (Supabase membalas "Could not find the 'status_id' column
-- of 'subtasks' in the schema cache").
--
-- Jalankan di Supabase -> SQL Editor, lalu refresh aplikasi.

alter table public.subtasks
  add column if not exists assignee_id uuid references public.profiles (id) on delete set null,
  add column if not exists status_id   uuid references public.statuses (id) on delete set null,
  add column if not exists due_date    date,
  add column if not exists priority    text;

-- Index bantu untuk filter/relasi per subtask.
create index if not exists subtasks_assignee_idx on public.subtasks (assignee_id);
create index if not exists subtasks_status_idx   on public.subtasks (status_id);

-- Supaya PostgREST langsung mengenali kolom baru tanpa menunggu cache expired.
notify pgrst, 'reload schema';
