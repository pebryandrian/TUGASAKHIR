-- My Member (Home, POV Project Manager): Project Manager boleh mengubah peran
-- anggota. Peran hanya dua nilai: 'member' dan 'project_manager'.
--
-- Sebelum migrasi ini, tabel `profiles` hanya bisa diubah oleh pemilik barisnya
-- sendiri, sehingga perubahan peran oleh PM ditolak diam-diam (0 baris).
--
-- AMAN DIJALANKAN BERULANG KALI. Jalankan di Supabase -> SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Pastikan kolom `role` ada, default 'member' (semua pendaftar baru = Member).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'member';

update public.profiles
set role = 'member'
where role is null or role not in ('member', 'project_manager');

-- Batasi nilai peran: hanya dua pilihan.
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'profiles'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'project_manager'));

-- ---------------------------------------------------------------------------
-- 2. Helper: apakah pengguna adalah Project Manager pada minimal satu project.
--    Dipakai sebagai syarat boleh mengubah peran anggota lain.
-- ---------------------------------------------------------------------------
create or replace function public.invisual_is_any_project_manager()
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
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Policy: PM boleh mengubah baris profil orang lain (hanya kolom `role`
--    yang benar-benar boleh berubah — dijaga trigger di bawah).
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_update_manager" on public.profiles;

create policy "profiles_update_manager"
  on public.profiles for update
  using (public.invisual_is_any_project_manager())
  with check (public.invisual_is_any_project_manager());

-- ---------------------------------------------------------------------------
-- 4. Trigger: batasi apa yang boleh diubah.
--    - Peran sendiri tidak boleh diubah (mencegah PM menurunkan dirinya sendiri
--      dan mencegah siapa pun menaikkan perannya sendiri lewat API).
--    - Saat mengubah profil orang lain, hanya kolom `role` yang boleh berbeda;
--      nama, email, dan foto tetap milik orang tersebut.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard_role_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() = old.id then
      raise exception 'Peran Anda sendiri tidak dapat diubah dari sini';
    end if;
    if not public.invisual_is_any_project_manager() then
      raise exception 'Hanya Project Manager yang dapat mengubah peran anggota';
    end if;
  end if;

  if auth.uid() is distinct from old.id then
    if new.name is distinct from old.name
       or new.email is distinct from old.email
       or new.avatar_url is distinct from old.avatar_url then
      raise exception 'Project Manager hanya boleh mengubah peran anggota, bukan data profilnya';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_role_update on public.profiles;

create trigger trg_profiles_guard_role_update
  before update on public.profiles
  for each row
  execute function public.profiles_guard_role_update();

notify pgrst, 'reload schema';
