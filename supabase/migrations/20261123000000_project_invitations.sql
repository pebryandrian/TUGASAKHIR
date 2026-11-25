-- Alur undangan anggota:
--   1. Project Manager mengundang anggota lewat email.
--   2. Undangan berstatus 'invited' dan muncul di notifikasi anggota.
--   3. Anggota menerima -> status 'active' (boleh mengakses project).
--   4. Anggota menolak  -> baris keanggotaan dihapus.
--
-- Sebelum migrasi ini, `addMemberByEmail` langsung menambah anggota (tanpa
-- undangan). Kode mendeteksi ada/tidaknya kolom `status`, jadi aplikasi tetap
-- berjalan sebelum migrasi dijalankan.
--
-- AMAN DIJALANKAN BERULANG KALI.
-- Jalankan di Supabase -> SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Kolom undangan
-- ---------------------------------------------------------------------------
alter table public.project_members
  add column if not exists status     text not null default 'active',
  add column if not exists invited_by uuid references public.profiles (id) on delete set null,
  add column if not exists invited_at timestamptz default now();

alter table public.project_members
  drop constraint if exists project_members_status_check;

alter table public.project_members
  add constraint project_members_status_check
  check (status in ('invited', 'active'));

-- ---------------------------------------------------------------------------
-- 2. Helper keanggotaan: hanya status 'active' yang dihitung.
--
--    CATATAN: fungsi ini sudah ada dengan nama parameter tertentu (mis. `p`).
--    PostgreSQL menolak CREATE OR REPLACE bila nama parameternya berbeda, jadi
--    nama parameter yang ada dideteksi dulu lalu dipakai ulang. Alias tabel
--    memakai `proj` agar tidak membayangi parameter yang bernama `p`.
-- ---------------------------------------------------------------------------
do $migrate$
declare
  arg_name text;
begin
  select split_part(pg_get_function_arguments(pr.oid), ' ', 1)
    into arg_name
  from pg_proc pr
  join pg_namespace n on n.oid = pr.pronamespace
  where n.nspname = 'public'
    and pr.proname = 'is_project_member'
  limit 1;

  if arg_name is null or arg_name = '' then
    arg_name := 'p_project';
  end if;

  execute format($fn$
    create or replace function public.is_project_member(%1$I uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $body$
      select exists (
        select 1
        from public.project_members pm
        where pm.project_id = %1$I
          and pm.user_id = auth.uid()
          and pm.status = 'active'
      )
      or exists (
        select 1
        from public.projects proj
        where proj.id = %1$I
          and proj.owner_id = auth.uid()
      );
    $body$
  $fn$, arg_name);
end
$migrate$;

-- ---------------------------------------------------------------------------
-- 3. Anggota yang diundang harus bisa MELIHAT undangannya sendiri.
--    Tanpa policy ini, baris keanggotaan berstatus 'invited' tidak terbaca
--    oleh yang diundang sehingga undangan tidak pernah muncul di notifikasi.
-- ---------------------------------------------------------------------------
drop policy if exists "project_members_self_read" on public.project_members;

create policy "project_members_self_read"
  on public.project_members for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Anggota boleh mengubah barisnya sendiri (menerima undangan, menandai
--    favorit). Perubahan PERAN tetap dikunci lewat trigger di bawah, karena
--    policy tidak bisa membandingkan nilai lama dan baru.
-- ---------------------------------------------------------------------------
drop policy if exists "project_members_self_respond" on public.project_members;

create policy "project_members_self_respond"
  on public.project_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Anggota boleh menolak undangan / keluar dari project.
-- ---------------------------------------------------------------------------
drop policy if exists "project_members_self_leave" on public.project_members;

create policy "project_members_self_leave"
  on public.project_members for delete
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Trigger: hanya Project Manager (atau pemilik project) yang boleh mengubah
--    peran anggota. Tanpa ini, anggota bisa menaikkan perannya sendiri.
-- ---------------------------------------------------------------------------
create or replace function public.project_members_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not exists (
      select 1 from public.projects pr
      where pr.id = old.project_id and pr.owner_id = auth.uid()
    ) and not exists (
      select 1 from public.project_members pm
      where pm.project_id = old.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'project_manager'
        and pm.status = 'active'
    ) then
      raise exception 'Hanya Project Manager yang dapat mengubah peran anggota';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_project_members_guard_role on public.project_members;

create trigger trg_project_members_guard_role
  before update on public.project_members
  for each row
  execute function public.project_members_guard_role();

-- ---------------------------------------------------------------------------
-- 7. Pastikan anggota yang sudah ada tetap 'active' (data lama).
-- ---------------------------------------------------------------------------
update public.project_members
set status = 'active'
where status is null;

notify pgrst, 'reload schema';
