-- Tabel 4.6 revisi15 menyebut `workspace_members` "Menyimpan keanggotaan
-- pengguna pada workspace beserta perannya", sedangkan tabelnya belum punya
-- kolom peran. Migrasi ini menambahkannya agar sesuai laporan.
--
-- Kode tidak mengirim kolom ini saat insert, sehingga aplikasi tetap berjalan
-- baik sebelum maupun sesudah migrasi dijalankan (nilai memakai default).
--
-- Jalankan di Supabase -> SQL Editor.

alter table public.workspace_members
  add column if not exists role text not null default 'member';

-- Pemilik workspace ditandai sebagai 'owner' (F-15).
update public.workspace_members wm
set role = 'owner'
from public.workspaces w
where w.id = wm.workspace_id
  and w.owner_id = wm.user_id
  and wm.role <> 'owner';

notify pgrst, 'reload schema';
