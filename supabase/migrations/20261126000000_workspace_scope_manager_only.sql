-- F-03 / F-15: pengelolaan workspace dan pembuatan project hanya untuk
-- Project Manager.
--
-- Sebelum migrasi ini, Member masih bisa:
--   * menambah workspace baru (dan otomatis menjadi pemiliknya),
--   * mengubah nama atau menghapus workspace,
--   * membuat scope/project baru.
--
-- Aturan yang dipakai sama dengan aplikasi (`canCreateProject()`):
--   * Project Manager pada minimal satu project  -> boleh
--   * akun yang belum tergabung di project mana pun (pendaftar baru) -> boleh,
--     supaya pengguna pertama tidak terkunci di Home kosong
--   * Member yang sudah tergabung di project -> TIDAK boleh
--
-- AMAN DIJALANKAN BERULANG KALI. Jalankan di Supabase -> SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Helper: boleh mengelola workspace & membuat project?
-- ---------------------------------------------------------------------------
create or replace function public.invisual_can_manage_projects()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects proj
    where proj.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.user_id = auth.uid()
      and pm.role = 'project_manager'
  )
  or not exists (
    select 1
    from public.project_members pm
    where pm.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. workspaces: semua anggota boleh membaca, hanya PM boleh menulis.
-- ---------------------------------------------------------------------------
drop policy if exists "workspace_insert_manager" on public.workspaces;
drop policy if exists "workspace_update_manager" on public.workspaces;
drop policy if exists "workspace_delete_manager" on public.workspaces;

create policy "workspace_insert_manager"
  on public.workspaces for insert
  with check (public.invisual_can_manage_projects());

create policy "workspace_update_manager"
  on public.workspaces for update
  using (public.invisual_can_manage_projects())
  with check (public.invisual_can_manage_projects());

create policy "workspace_delete_manager"
  on public.workspaces for delete
  using (public.invisual_can_manage_projects());

-- Policy tulis lama yang masih longgar ikut dibuang (policy bersifat OR).
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workspaces'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and policyname not in (
        'workspace_insert_manager',
        'workspace_update_manager',
        'workspace_delete_manager'
      )
  loop
    execute format('drop policy if exists %I on public.workspaces', pol.policyname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. projects: pembuatan project (scope/card baru) hanya oleh PM.
--    Policy select/update/delete yang sudah ada tidak diubah di sini.
-- ---------------------------------------------------------------------------
drop policy if exists "projects_insert_manager" on public.projects;

create policy "projects_insert_manager"
  on public.projects for insert
  with check (public.invisual_can_manage_projects());

notify pgrst, 'reload schema';
