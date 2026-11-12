# Audit Konsistensi Laporan TA ↔ Aplikasi

Acuan: **`LaporanTA-PebryAndrian-revisi13.docx`** (13 November 2026, 4,31 MB) —
file laporan terbaru, berada di folder induk `TUGASAKHIR/`, **bukan** di `invisual/docs/`.

> Catatan: `invisual/docs/LaporanTA-PebryAndrian-revisi2.docx` dan `revisi3.docx` adalah
> salinan lama (versi 0,6–0,8 MB) yang sudah tidak dipakai. Audit sebelumnya sempat
> memakai revisi3 sehingga beberapa temuan tidak relevan lagi.

Metode: ekstraksi teks `word/document.xml` + pembacaan kode `app/`, `lib/` + query langsung
ke Supabase (13 November 2026).

Legenda: ✅ sesuai · ⚠️ sebagian · ❌ belum ada

---

## 1. Kebutuhan fungsional (Tabel 4.2 revisi13)

| Kode | Kebutuhan | Implementasi di kode | Status |
|---|---|---|---|
| F-01 | Landing page, registrasi, login, logout, pemulihan kata sandi, proteksi rute | `app/page.tsx` (landing), `app/signin` (signup/login/reset + Google), `proxy.ts`, **Remember me** berfungsi lewat `cookieOptions.maxAge` | ✅ |
| F-02 | Home = Scope of Work (kartu proyek + progres selesai/total) + My Member | `app/home/page.tsx`; progres dari `listProjectTaskStats()`, My Member dari `listProfiles()` | ✅ |
| F-03 | Buat, ubah, hapus proyek, tandai favorit, **pengaturan jadwal** | `createProject`, `updateProject` (nama, deskripsi, `start_date`, `due_date`), `deleteProject`, `setProjectFavorite` | ✅ |
| F-04 | Tambah anggota lewat email + penetapan peran | `addMemberByEmail(projectId, email, role)` + pilihan peran pada modal undang | ✅ |
| F-05 | CRUD tugas (nama, deskripsi, prioritas, tenggat, status, penanggung jawab) | `createTask`, `updateTask`, `deleteTasks`, panel detail tugas | ✅ |
| F-06 | Subtask bertingkat dengan penanggung jawab, status, tenggat, prioritas | Tabel `subtasks` 10 kolom (4 kolom meta sudah dimigrasi) + baris subtask di Main Table | ✅ |
| F-07 | Alur kerja 4 status baku + ubah status (**Kanban**) | Tab Main Table & **Kanban** (drag & drop → `tasks.status_id`) | ✅ |
| F-08 | Pengelompokan tugas + penanda warna | Tabel `task_groups` (`color`, `position`) | ✅ |
| F-09 | Kalender bulanan + agenda | `CalendarView` (mode Month/Agenda, filter, sort, legenda status) | ✅ |
| F-10 | Gantt + Chart | `GanttView` & `ChartView` (tab tambahan lewat tombol `+`) | ✅ |
| F-11 | Doc: sunting teks, sisipkan gambar & berkas, autosave | Editor blok + `uploadDocFile()` ke bucket `project-docs`, autosave ke `docs.blocks` | ✅ |
| F-12 | Komentar bertingkat + suka + unggah lampiran | `addComment`, `likeComment`, `uploadAttachment()` ke bucket `task-attachments` | ✅ |
| F-13 | Hak akses Project Manager vs Member | `lib/permissions.ts` (baca `project_members.role`, owner = PM) + gating tombol + RLS | ✅ |
| F-14 | Ubah nama, foto profil, kata sandi | `updateProfile`, `changePassword`, `uploadAvatar()` ke bucket `avatars` | ✅ |
| F-15 | Buat, ubah nama, hapus, dan **memilih workspace aktif** | `WorkspaceSelector` terkendali; workspace aktif menyaring `listProjects(workspaceId)` | ✅ |

## 2. Kebutuhan non-fungsional (Tabel 4.3)

| Kode | Aspek | Bukti | Status |
|---|---|---|---|
| NF-01 | Kinerja | `loadBoard()` memuat 6 query paralel lalu 3 query lanjutan | ✅ |
| NF-02 | Keamanan | HTTPS (Supabase) + RLS per keanggotaan proyek | ✅ |
| NF-03 | Kemudahan penggunaan | Satu pola modal/dropdown di seluruh halaman | ✅ |
| NF-04 | Responsif | Kelas `sm:`/`lg:`/`xl:` pada semua halaman | ✅ |
| NF-05 | Pemeliharaan | TypeScript `strict`, lapisan `lib/db.ts` terpisah dari UI | ✅ |
| NF-06 | Ketersediaan | Supabase + Vercel (cloud) | ✅ |

## 3. Basis data (Tabel 4.6)

Dua belas tabel terverifikasi: `workspaces`, `workspace_members`, `profiles`, `projects`,
`project_members`, `statuses`, `task_groups`, `tasks`, `subtasks`, `comments`,
`attachments`, `docs`.

| Catatan | Detail |
|---|---|
| ✅ `project_members.favorite` | Ada dan dipakai (`listFavoriteProjects`, `setProjectFavorite`) |
| ✅ `attachments.storage_path` | Ada dan dipakai (path di bucket `task-attachments`) |
| ⚠️ `workspace_members` | Laporan menyebut "beserta perannya", tetapi tabel hanya punya `workspace_id` + `user_id` (tanpa kolom peran). Peran tersimpan di `project_members.role`. |

## 4. Hal yang perlu diputuskan

| # | Temuan | Pilihan |
|---|---|---|
| 1 | **Login memakai Supabase client di browser**, sedangkan Gambar 4.12 menyebut "data dikirim ke server action Next.js" | (a) ubah kode jadi server action, atau (b) sesuaikan kalimat di laporan |
| 2 | **UC-03 disebut "halaman Anggota Proyek"**, implementasi berupa modal di halaman proyek | (a) jadikan halaman terpisah, atau (b) sebut "panel/modal Anggota Proyek" di laporan |
| 3 | **Kartu statistik + panel Deadline/Aktivitas** di Home adalah tambahan di luar F-02 revisi13 | (a) biarkan sebagai pengembangan tambahan, atau (b) dihapus agar persis seperti laporan |
| 4 | `workspace_members` tanpa kolom peran | (a) tambah kolom `role`, atau (b) perbaiki kalimat Tabel 4.6 |
| 5 | **Lampiran 1** revisi13 tidak lagi memuat SQL (diganti daftar pertanyaan wawancara) | Tidak perlu tindakan |

## 5. Tindakan manual yang masih diperlukan (Supabase → SQL Editor)

| File migrasi | Fungsi |
|---|---|
| `supabase/migrations/20261114000000_rls_roles.sql` | Menutup lubang RLS: member tidak lagi bisa membuat/menghapus grup dan menambah label status; menambah policy PM untuk ubah/hapus proyek dan ubah peran anggota |
| `supabase/migrations/20261114000001_attachments_storage.sql` | Membuat bucket `task-attachments` (lampiran tugas) |
| `supabase/migrations/20261114000002_storage_avatars_docs.sql` | Membuat bucket `avatars` (foto profil) dan `project-docs` (gambar/berkas tab Doc) |

Diverifikasi 13 November 2026: **ketiga bucket belum ada** (`upload` → `Bucket not found`).
Tanpa migrasi ini, unggah lampiran, foto profil, dan berkas Doc akan menampilkan pesan
"penyimpanan belum siap" (bukan error mentah).

## 6. Bukti pengujian terakhir

| Uji | Hasil |
|---|---|
| `npx tsc --noEmit` | bersih |
| `next build` | sukses (12 rute) |
| Join `assignee` pada query deadline | OK |
| Query aktivitas (tugas + komentar) | OK |
| Statistik dashboard | OK |
| Favorit (update baris `project_members` milik owner) | OK |
| Ubah jadwal proyek (`start_date` → `due_date`) | OK |
| Filter proyek per workspace aktif | OK |
| Unggah ke `task-attachments` / `avatars` / `project-docs` | gagal — bucket belum dibuat |
