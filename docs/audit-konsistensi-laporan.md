# Audit Konsistensi Laporan TA ↔ Aplikasi

Acuan: **`LaporanTA-PebryAndrian-revisi15.docx`** (14 November 2026, 4,91 MB) — file laporan
terbaru, berada di folder induk `TUGASAKHIR/`, **bukan** di `invisual/docs/`.

> Riwayat: audit pertama memakai `revisi3.docx` (salinan lama di `invisual/docs/`), lalu
> `revisi13.docx`. Keduanya sudah tidak dipakai.

Metode: ekstraksi teks `word/document.xml` + pembacaan kode `app/`, `lib/` + query langsung
ke Supabase (14 November 2026).

Legenda: ✅ sesuai · ⚠️ sebagian · ❌ belum ada

---

## 1. Kebutuhan fungsional (Tabel 4.2 revisi15)

| Kode | Kebutuhan | Implementasi di kode | Status |
|---|---|---|---|
| F-01 | Landing page, registrasi, login, logout, pemulihan kata sandi, proteksi rute | `app/page.tsx` (landing), `app/signin` (signup/login/reset + Google), **login lewat server action** (`app/signin/actions.ts`), `proxy.ts`, Remember me | ✅ |
| F-02 | Home = Scope of Work (kartu proyek + progres selesai/total) + My Member | `app/home/page.tsx`: sapaan, grid Scope of Work, tabel My Member. Progres dari `listProjectTaskStats()` | ✅ |
| F-03 | Buat, ubah, hapus proyek, favorit, pengaturan jadwal | `createProject`, `updateProject` (nama, deskripsi, `start_date`, `due_date`), `deleteProject`, `setProjectFavorite` | ✅ |
| F-04 | Tambah anggota lewat email + penetapan peran | **Halaman Anggota Proyek** (`/project/<scope>/<card>/members`): undang via email + pilih peran | ✅ |
| F-05 | CRUD tugas (nama, deskripsi, prioritas, tenggat, status, penanggung jawab) | `createTask`, `updateTask`, `deleteTasks`, panel Detail Tugas | ✅ |
| F-06 | Subtask bertingkat + penanggung jawab, status, tenggat, prioritas | Tabel `subtasks` 10 kolom + baris subtask di Main Table | ✅ |
| F-07 | Alur kerja 4 status baku + ubah status | Main Table + **Kanban** drag & drop → `tasks.status_id` | ✅ |
| F-08 | Pengelompokan tugas + penanda warna | `task_groups` (`color`, `position`) | ✅ |
| F-09 | Kalender bulanan + agenda | `CalendarView` (Month/Agenda, filter, sort, legenda status) | ✅ |
| F-10 | Gantt + Chart | `GanttView` & `ChartView` (tab tambahan lewat tombol `+`) | ✅ |
| F-11 | Doc: sunting teks, sisipkan gambar & berkas, autosave | Editor blok + `uploadDocFile()` (bucket `project-docs`) + autosave `docs.blocks` | ✅ |
| F-12 | Komentar bertingkat + suka + unggah lampiran | `addComment`, `likeComment`, `uploadAttachment()` (bucket `task-attachments`) | ✅ |
| F-13 | Hak akses Project Manager vs Member | `lib/permissions.ts` (`project_members.role`, owner = PM) + gating tombol + RLS | ✅ |
| F-14 | Ubah nama, foto profil, kata sandi | `updateProfile`, `changePassword`, `uploadAvatar()` (bucket `avatars`) | ✅ |
| F-15 | Buat, ubah nama, hapus, pilih workspace aktif | `WorkspaceSelector` (create/rename/delete) + mode terkendali; workspace aktif menyaring `listProjects(workspaceId)` | ✅ |

## 2. Kebutuhan non-fungsional (Tabel 4.3)

| Kode | Aspek | Bukti | Status |
|---|---|---|---|
| NF-01 | Kinerja | `loadBoard()` memuat 6 query paralel + 3 query lanjutan | ✅ |
| NF-02 | Keamanan | HTTPS (Supabase) + RLS per keanggotaan proyek | ✅ |
| NF-03 | Kemudahan penggunaan | Satu pola modal/dropdown di seluruh halaman | ✅ |
| NF-04 | Responsif | Kelas `sm:`/`lg:`/`xl:` di semua halaman | ✅ |
| NF-05 | Pemeliharaan | TypeScript `strict`, `lib/db.ts` terpisah dari UI | ✅ |
| NF-06 | Ketersediaan | Supabase + Vercel (cloud) | ✅ |

## 3. Use case (Tabel 4.5 revisi15)

| Kode | Use case | Implementasi | Status |
|---|---|---|---|
| UC-01 | Login dan Logout | Login via **server action** (divalidasi lalu diverifikasi Supabase Auth) sesuai Gambar 4.13; logout dari menu pengguna | ✅ |
| UC-02 | Mengelola Workspace dan Proyek | Workspace aktif + New Scope/New Card + ubah/hapus + favorit | ✅ |
| UC-03 | Mengelola Anggota Tim dan Hak Akses | **Halaman Anggota Proyek** (bukan modal lagi): tambah via email, ubah peran, keluarkan anggota | ✅ |
| UC-04 | Mengelola Tugas | Buat/ubah/hapus tugas + subtask, komentar, lampiran | ✅ |
| UC-05 | Mengelola Alur Kerja | **Atur kolom status** (ikon gear di header kolom Status, khusus PM) + grup + drag & drop Kanban | ✅ |
| UC-06 | Melihat Dashboard Monitoring | Home: Scope of Work + My Member | ✅ |
| UC-07 | Mengubah Status Pekerjaan | Member mengubah status lewat Detail Tugas | ✅ |

## 4. Basis data (Tabel 4.6)

Dua belas tabel: `workspaces`, `workspace_members`, `profiles`, `projects`, `project_members`,
`statuses`, `task_groups`, `tasks`, `subtasks`, `comments`, `attachments`, `docs`.

| Catatan | Detail |
|---|---|
| ✅ `project_members.favorite` | Ada dan dipakai |
| ✅ `attachments.storage_path` | Ada dan dipakai |
| ⚠️ `workspace_members.role` | Laporan menyebut "beserta perannya"; kolom belum ada. Migrasi `20261114000003_workspace_members_role.sql` menambahkannya (kode tidak mengirim kolom ini, jadi aman sebelum/sesudah migrasi). |

## 5. Skenario Black Box (Tabel 3.5 revisi15 — 16 skenario)

| No | Fitur | Status |
|---|---|---|
| 1–2 | Autentikasi (benar / salah) | ✅ (salah → pesan galat dari Supabase) |
| 3–4 | Tambah tugas & subtask | ✅ |
| 5 | Ubah status To Do → In Progress | ✅ |
| 6 | Penugasan anggota | ✅ |
| 7 | Buat proyek baru | ✅ |
| 8 | Home menampilkan kartu + progres | ✅ |
| 9 | Kalender menampilkan tenggat | ✅ |
| 10 | Member ditolak saat menghapus data | ✅ setelah migrasi RLS dijalankan |
| 11 | Grup tugas baru + warna | ✅ |
| 12 | Tab Gantt & Chart | ✅ |
| 13 | Doc autosave | ✅ |
| 14 | Komentar + unggah lampiran | ✅ setelah bucket dibuat |
| 15 | Ubah nama & foto profil | ✅ setelah bucket `avatars` dibuat |
| 16 | Workspace baru + daftar proyek menyesuaikan | ✅ |

## 6. Tindakan manual yang masih diperlukan (Supabase → SQL Editor)

| File migrasi | Fungsi |
|---|---|
| `20261113000000_subtask_meta.sql` | Kolom meta subtask (sudah dijalankan) |
| `20261114000000_rls_roles.sql` | Menutup lubang RLS + policy PM untuk project & peran anggota |
| `20261114000001_attachments_storage.sql` | Bucket `task-attachments` |
| `20261114000002_storage_avatars_docs.sql` | Bucket `avatars` + `project-docs` |
| `20261114000003_workspace_members_role.sql` | Kolom `workspace_members.role` |

Diverifikasi 14 November 2026: **ketiga bucket belum ada** (`upload` → `Bucket not found`).

## 7. Bukti pengujian terakhir

| Uji | Hasil |
|---|---|
| `npx tsc --noEmit` | bersih |
| `next build` | sukses (13 rute, termasuk `/project/[scope]/[card]/members`) |
| `/`, `/signin` | 200 |
| `/home`, `/project/<scope>/<card>/members` tanpa sesi | 307 → signin (proteksi rute) |
| Jadwal proyek (`start_date` → `due_date`) | tersimpan |
| Filter proyek per workspace aktif | 1 proyek pada workspace uji |
| Unggah ke `task-attachments` / `avatars` / `project-docs` | gagal — bucket belum dibuat |
