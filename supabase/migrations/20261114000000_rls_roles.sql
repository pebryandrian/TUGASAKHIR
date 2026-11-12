-- Menutup dua lubang hak akses yang ditemukan saat audit (F-13):
--   * Member masih bisa MEMBUAT dan MENGHAPUS grup tugas.
--   * Member masih bisa MENAMBAH label/status alur kerja.
-- Keduanya tindakan pengaturan struktur project, seharusnya hanya Project Manager.
--
-- Jalankan di Supabase -> SQL Editor, lalu refresh aplikasi.

-- ---------------------------------------------------------------------------
-- 1. Hapus seluruh policy tulis lama pada task_groups & statuses.
--    Policy bersifat OR, jadi policy lama yang mengizinkan member harus dibuang
--    dulu — kalau tidak, policy baru tidak akan berpengaruh.
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('task_groups', 'statuses')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Helper: apakah pengguna adalah Project Manager pada project tersebut.
-- ---------------------------------------------------------------------------
create or replace function public.is_project_manager(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project
      and pm.user_id = auth.uid()
      and pm.role = 'project_manager'
  )
  or exists (
    select 1
    from public.projects p
    where p.id = p_project
      and p.owner_id = auth.uid()
  );
$$;

create or replace function public.is_project_member(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project
      and pm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.projects p
    where p.id = p_project
      and p.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. task_groups: semua anggota boleh membaca, hanya PM boleh mengubah.
-- ---------------------------------------------------------------------------
create policy "task_groups_read_member"
  on public.task_groups for select
  using (public.is_project_member(project_id));

create policy "task_groups_insert_manager"
  on public.task_groups for insert
  with check (public.is_project_manager(project_id));

create policy "task_groups_update_manager"
  on public.task_groups for update
  using (public.is_project_manager(project_id))
  with check (public.is_project_manager(project_id));

create policy "task_groups_delete_manager"
  on public.task_groups for delete
  using (public.is_project_manager(project_id));

-- ---------------------------------------------------------------------------
-- 4. statuses: semua anggota boleh membaca, hanya PM boleh mengubah.
-- ---------------------------------------------------------------------------
create policy "statuses_read_member"
  on public.statuses for select
  using (public.is_project_member(project_id));

create policy "statuses_insert_manager"
  on public.statuses for insert
  with check (public.is_project_manager(project_id));

create policy "statuses_update_manager"
  on public.statuses for update
  using (public.is_project_manager(project_id))
  with check (public.is_project_manager(project_id));

create policy "statuses_delete_manager"
  on public.statuses for delete
  using (public.is_project_manager(project_id));

-- ---------------------------------------------------------------------------
-- 5. projects: hanya PM/pemilik yang boleh mengubah atau menghapus (F-03).
--    Policy select dibiarkan seperti semula.
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and cmd in ('UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.projects', pol.policyname);
  end loop;
end $$;

create policy "projects_update_manager"
  on public.projects for update
  using (public.is_project_manager(id))
  with check (public.is_project_manager(id));

create policy "projects_delete_manager"
  on public.projects for delete
  using (public.is_project_manager(id));

-- ---------------------------------------------------------------------------
-- 6. project_members: PM boleh mengatur peran anggota (UC-03).
-- ---------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'project_members'
      and cmd in ('UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.project_members', pol.policyname);
  end loop;
end $$;

create policy "project_members_update_manager"
  on public.project_members for update
  using (public.is_project_manager(project_id))
  with check (public.is_project_manager(project_id));

create policy "project_members_delete_manager"
  on public.project_members for delete
  using (public.is_project_manager(project_id));

-- Supaya perubahan policy langsung dikenali.
notify pgrst, 'reload schema';
