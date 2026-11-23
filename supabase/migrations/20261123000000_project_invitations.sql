-- Alur undangan anggota:
--   1. Project Manager mengundang anggota lewat email.
--   2. Undangan berstatus 'invited' dan muncul di notifikasi anggota.
--   3. Anggota menerima -> status 'active' (boleh mengakses project).
--   4. Anggota menolak  -> baris dihapus.
--
-- Sebelum migrasi ini, `addMemberByEmail` langsung menambah anggota (tanpa
-- undangan). Kode mendeteksi ada/tidaknya kolom `status`, jadi aplikasi tetap
-- berjalan sebelum migrasi dijalankan.
--
-- Jalankan di Supabase -> SQL Editor.

alter table public.project_members
  add column if not exists status     text not null default 'active',
  add column if not exists invited_by uuid references public.profiles (id) on delete set null,
  add column if not exists invited_at timestamptz default now();

-- Hanya 'invited' atau 'active' yang diizinkan.
alter table public.project_members
  drop constraint if exists project_members_status_check;

alter table public.project_members
  add constraint project_members_status_check
  check (status in ('invited', 'active'));

-- ---------------------------------------------------------------------------
-- Helper keanggotaan hanya menghitung anggota yang sudah menerima undangan.
-- Sebelumnya cukup "ada baris", sehingga anggota yang belum menerima undangan
-- bisa langsung membaca isi project.
-- ---------------------------------------------------------------------------
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
      and pm.status = 'active'
  )
  or exists (
    select 1
    from public.projects p
    where p.id = p_project
      and p.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Anggota boleh menerima/menolak undangannya sendiri, tetapi TIDAK boleh
-- mengubah peran maupun menambah dirinya ke project lain.
-- ---------------------------------------------------------------------------
drop policy if exists "project_members_self_respond" on public.project_members;

create policy "project_members_self_respond"
  on public.project_members for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status in ('invited', 'active')
    -- peran tidak boleh diubah sendiri: nilai baru harus sama dengan yang lama
    and role = (select pm.role from public.project_members pm
                where pm.project_id = project_members.project_id
                  and pm.user_id = auth.uid())
  );

-- Anggota juga boleh menghapus barisnya sendiri (menolak undangan / keluar).
drop policy if exists "project_members_self_leave" on public.project_members;

create policy "project_members_self_leave"
  on public.project_members for delete
  using (user_id = auth.uid());

notify pgrst, 'reload schema';
