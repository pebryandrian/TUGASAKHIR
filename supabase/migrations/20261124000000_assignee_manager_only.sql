-- F-13 Hak akses: pembagian tugas adalah wewenang Project Manager.
--
-- Sebelum migrasi ini, siapa pun yang bisa memperbarui tugas (termasuk Member)
-- dapat mengubah kolom `assignee_id` — penanggung jawab tugas — lewat aplikasi
-- maupun langsung ke API. Policy RLS tidak bisa membandingkan nilai lama dan
-- baru, jadi penguncian dilakukan lewat trigger.
--
-- Yang tetap boleh dilakukan Member pada tugasnya: mengubah status, mencentang
-- selesai, menulis deskripsi/komentar, dan mengunggah lampiran. Hanya kolom
-- penanggung jawab (tasks.assignee_id & subtasks.assignee_id) yang dikunci.
--
-- AMAN DIJALANKAN BERULANG KALI. Jalankan di Supabase -> SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Helper: apakah pengguna adalah Project Manager pada project tersebut.
--    Dibuat sendiri (bukan mengandalkan migrasi lain) agar migrasi ini bisa
--    dijalankan berdiri sendiri.
-- ---------------------------------------------------------------------------
create or replace function public.invisual_is_project_manager(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects proj
    where proj.id = p_project
      and proj.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project
      and pm.user_id = auth.uid()
      and pm.role = 'project_manager'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Tugas: assignee_id hanya boleh diubah Project Manager.
-- ---------------------------------------------------------------------------
create or replace function public.tasks_guard_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_id is distinct from old.assignee_id then
    if not public.invisual_is_project_manager(old.project_id) then
      raise exception 'Hanya Project Manager yang dapat mengubah penanggung jawab tugas';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_guard_assignee on public.tasks;

create trigger trg_tasks_guard_assignee
  before update on public.tasks
  for each row
  execute function public.tasks_guard_assignee();

-- ---------------------------------------------------------------------------
-- 3. Subtask: perlakuan yang sama. Project dicari lewat tabel tasks.
-- ---------------------------------------------------------------------------
create or replace function public.subtasks_guard_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project uuid;
begin
  if new.assignee_id is distinct from old.assignee_id then
    select t.project_id into v_project
    from public.tasks t
    where t.id = old.task_id;

    if v_project is not null and not public.invisual_is_project_manager(v_project) then
      raise exception 'Hanya Project Manager yang dapat mengubah penanggung jawab subtask';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_subtasks_guard_assignee on public.subtasks;

create trigger trg_subtasks_guard_assignee
  before update on public.subtasks
  for each row
  execute function public.subtasks_guard_assignee();

notify pgrst, 'reload schema';
