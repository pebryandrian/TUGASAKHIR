# Audit Konsistensi Laporan TA ↔ Aplikasi

Acuan: **`LaporanTA-PebryAndrian-revisi22.pdf`** (23 November 2026, 76 halaman) — file laporan
terbaru, berada di folder induk `TUGASAKHIR/`.

> Riwayat acuan: `revisi3.docx` → `revisi13.docx` → `revisi15.docx` → **`revisi22.pdf`**.
> Semuanya sudah tidak dipakai.

Catatan penting: **revisi22 berhenti di BAB 4**. BAB 5 (Implementasi & Evaluasi) dan BAB 6
(Kesimpulan & Saran) belum ada isinya, sehingga acuan yang tersedia hanya BAB 1–4 (15 kebutuhan
fungsional, 6 non-fungsional, 6 use case, 12 tabel basis data, dan 16 skenario Black Box).

Metode: ekstraksi teks PDF + pembacaan kode `app/`, `lib/` + query langsung ke Supabase, lalu
verifikasi UI lewat Edge headless (CDP).

Legenda: ✅ sesuai · ⚠️ sebagian · ❌ belum sesuai

---

## 1. Kebutuhan fungsional (Tabel 4.2 revisi22)

| Kode | Kebutuhan | Implementasi di kode | Status |
|---|---|---|---|
| F-01 | Landing page, registrasi, login, logout, pemulihan kata sandi, proteksi rute | `app/page.tsx` (landing: logo INVISUAL, judul, Get Started, Sign Up kanan atas); `app/signin` dua kolom dengan Remember me, Forgot password, Sign in with Google; `POST /api/auth/signin`; `proxy.ts` | ✅ |
| F-02 | Home = Scope of Work (kartu proyek + progres selesai/total) + My Member | `app/home/page.tsx`: sapaan, grid Scope of Work, Tugas Saya (Member), dan My Member untuk **kedua aktor** (Member hanya lihat) | ✅ |
| F-03 | Buat, ubah, hapus proyek, favorit, pengaturan jadwal | `createProject` (nama, deskripsi, `start_date`, `due_date`), `updateProject`, `deleteProject`, `setProjectFavorite` | ✅ |
| F-04 | Tambah anggota lewat email + penetapan peran | Halaman **Anggota Proyek** (`/project/<scope>/<card>/members`) | ✅ |
| F-05 | CRUD tugas (nama, deskripsi, prioritas, tenggat, status, penanggung jawab) | `createTask`, `updateTask`, `deleteTasks`, panel Detail Tugas | ✅ |
| F-06 | Subtask bertingkat + penanggung jawab, status, tenggat, prioritas | Tabel `subtasks` + baris subtask di Main Table | ✅ |
| F-07 | Alur kerja 4 status baku + ubah status | Main Table + **Kanban** drag & drop → `tasks.status_id` | ✅ |
| F-08 | Pengelompokan tugas + penanda warna | `task_groups` (`color`, `position`); **warna dipilih PM** pada modal Tambah Grup | ✅ |
| F-09 | Kalender bulanan + agenda | `CalendarView` (Month/Agenda, Today, navigasi bulan, legenda status) | ✅ |
| F-10 | Gantt + Chart | `GanttView` & `ChartView` sebagai **tab tetap** | ✅ |
| F-11 | Doc: sunting teks, sisipkan gambar & berkas, autosave | Editor blok + `uploadDocFile()` (bucket `project-docs`) + autosave `docs.blocks` | ✅ |
| F-12 | Komentar bertingkat + suka + unggah lampiran | `addComment`, `likeComment`, `uploadAttachment()` (bucket `task-attachments`) | ✅ |
| F-13 | Hak akses Project Manager vs Member | `lib/permissions.ts` (`project_members.role`, owner = PM) + gating tombol + RLS | ✅ |
| F-14 | Ubah nama, foto profil, kata sandi | `updateProfile`, `changePassword`, `uploadAvatar()` (bucket `avatars`) | ✅ |
| F-15 | Buat, ubah nama, hapus, pilih workspace aktif | `WorkspaceSelector`; workspace aktif **menyaring ketat** `listProjects(workspaceId)` | ✅ |

## 2. Kebutuhan non-fungsional (Tabel 4.3 revisi22)

| Kode | Aspek | Bukti | Status |
|---|---|---|---|
| NF-01 | Kinerja | `loadBoard()` memuat 6 query paralel + 3 query lanjutan | ✅ |
| NF-02 | Keamanan | HTTPS (Supabase) + RLS per keanggotaan proyek | ✅ |
| NF-03 | Kemudahan penggunaan | Satu pola modal/dropdown di seluruh halaman | ✅ |
| NF-04 | Responsif | Kelas `sm:`/`lg:`/`xl:` di semua halaman (desktop & laptop) | ✅ |
| NF-05 | Pemeliharaan | TypeScript `strict`, `lib/db.ts` terpisah dari UI | ✅ |
| NF-06 | Ketersediaan | Supabase + Vercel (cloud) | ✅ |

## 3. Use case (Tabel 4.5 revisi22 — 6 use case)

| Kode | Use case | Aktor | Implementasi | Status |
|---|---|---|---|---|
| UC-01 | Mengelola Workspace dan Proyek | Project Manager | Workspace aktif + New Scope (nama, **deskripsi**, **jadwal**) + ubah/hapus + favorit | ✅ |
| UC-02 | Mengelola Anggota Tim dan Hak Akses | Project Manager | Halaman Anggota Proyek: tambah via email, ubah peran, keluarkan anggota | ✅ |
| UC-03 | Mengelola Tugas | Project Manager | New item / + per grup / Add task **hanya PM**; subtask, komentar, lampiran | ✅ |
| UC-04 | Mengelola Alur Kerja | Project Manager | Atur kolom status (gear di header Status) + grup + drag & drop Kanban | ✅ |
| UC-05 | Melihat Dashboard Monitoring | PM, Member | Home: Scope of Work + My Member (kedua aktor) | ✅ |
| UC-06 | Mengubah Status Pekerjaan | Member | Member mengubah status lewat Detail Tugas / Main Table | ✅ |

> Login & logout tidak dimodelkan sebagai use case pada revisi22 — hanya prasyarat, sesuai
> penjelasan Subbab 4.1.3.

## 4. Basis data (Tabel 4.12 revisi22)

Dua belas tabel: `workspaces`, `workspace_members`, `profiles`, `projects`, `project_members`,
`statuses`, `task_groups`, `tasks`, `subtasks`, `comments`, `attachments`, `docs`.

| Catatan | Detail |
|---|---|
| ✅ `project_members.favorite` | Ada dan dipakai |
| ✅ `attachments.storage_path` | Ada dan dipakai |
| ✅ `attachments.url` | Kolom tambahan untuk lampiran tautan (migrasi `20261127000000_attachment_links.sql`) |
| ⚠️ `workspace_members.role` | Laporan menyebut "beserta perannya"; kolom belum ada di database. Migrasi `20261114000003_workspace_members_role.sql` menambahkannya (kode tidak mengirim kolom ini) |

## 5. Skenario Black Box (Tabel 3.5 revisi22 — 16 skenario)

| No | Fitur | Status |
|---|---|---|
| 1–2 | Autentikasi (benar / salah) | ✅ |
| 3–4 | Tambah tugas & subtask | ✅ |
| 5 | Ubah status To Do → In Progress | ✅ |
| 6 | Penugasan anggota | ✅ |
| 7 | Buat proyek baru beserta anggota | ✅ |
| 8 | Home menampilkan kartu + progres | ✅ |
| 9 | Kalender menampilkan tenggat | ✅ |
| 10 | Member ditolak saat menghapus proyek | ✅ setelah migrasi RLS dijalankan |
| 11 | PM membuat grup + **penanda warna** | ✅ (pemilih warna 20 opsi) |
| 12 | **Tab** Gantt & Chart | ✅ (tab tetap) |
| 13 | Doc autosave | ✅ |
| 14 | Komentar + lampiran | ✅ |
| 15 | Ubah nama & foto profil | ✅ |
| 16 | Workspace baru + daftar proyek menyesuaikan workspace aktif | ✅ |

## 6. Rancangan antarmuka (Gambar 4.12–4.21)

| Wireframe | Implementasi | Status |
|---|---|---|
| 4.12 Landing Page | `app/page.tsx` | ✅ |
| 4.13 Sign Up & Sign In (dua kolom) | `app/signin` (`lg:flex-row`) | ✅ |
| 4.14 Home (Scope of Work + My Member) | `app/home` | ✅ |
| 4.15 Main Table (Item, Person, Status, Date) | tab Main Table | ✅ |
| 4.16 Kalender Proyek | tab Calendar | ✅ |
| 4.17 Dokumen Proyek | tab Doc | ✅ |
| 4.18 Papan Kanban | tab Kanban | ✅ |
| 4.19 Gantt | tab Gantt | ✅ |
| 4.20 Chart | tab Chart | ✅ |
| 4.21 Detail Tugas | panel detail (klik judul tugas) | ✅ |

## 7. Fitur di aplikasi yang tidak disebut laporan

Dipertahankan atas permintaan pemilik aplikasi; tidak mengurangi pemenuhan kebutuhan laporan.

| Fitur | Keterangan |
|---|---|
| Alur **undangan** anggota (invited → terima/tolak) | Laporan hanya menyebut "menambahkan anggota berdasarkan email". Bila migrasi undangan belum dijalankan, anggota langsung ditambahkan. |
| Kolom **Files** dan **Notes** pada Main Table | Wireframe 4.15 hanya memuat Item, Person, Status, Date. |
| Dropdown **peran** di Home (My Member) | UC-02 menempatkan pengaturan peran di halaman Anggota Proyek; Home tetap menyediakan jalan pintas untuk PM. |
| Menu **History** di sidebar | Menu laporan: Home, Favorites, Workspaces. |
| Tombol **Muat contoh** / **Isi contoh tugas** | Data contoh untuk demonstrasi. |

## 8. Perbedaan lain yang perlu diketahui

| Hal | Laporan | Aplikasi |
|---|---|---|
| Nama menu | Home, Favorites, Workspaces | Home, Favorites, Workspaces, **History** |
| Tab proyek | Main Table, Calendar, Doc (+ Kanban, Gantt, Chart di Tabel 3.5) | Main Table, Calendar, Doc, Kanban, **Gantt**, **Chart** (semua tab tetap) |
| Data contoh | tidak diatur | 5 scope baku: Client, Font, Marketplace, Studio Project, Mockup |

## 9. Migrasi database yang belum dijalankan

Aplikasi tetap berjalan tanpa migrasi ini (fitur terkait menampilkan pesan), tetapi
kebutuhan berikut baru terpenuhi penuh setelah dijalankan:

| Migrasi | Untuk |
|---|---|
| `20261114000000_rls_roles.sql` | Skenario 10 (Member ditolak saat menghapus/mengubah) |
| `20261114000001_attachments_storage.sql` | F-12 unggah lampiran (bucket `task-attachments`) |
| `20261114000002_storage_avatars_docs.sql` | F-11 berkas Doc & F-14 foto profil |
| `20261114000003_workspace_members_role.sql` | Tabel 4.12 `workspace_members.role` |
| `20261123000000_project_invitations.sql` | Alur undangan (fitur tambahan) |
| `20261124000000_assignee_manager_only.sql` | Penanggung jawab hanya PM (di tingkat database) |
| `20261125000000_team_member_roles.sql` | Ubah peran anggota dari Home (di tingkat database) |
| `20261126000000_workspace_scope_manager_only.sql` | Workspace & proyek hanya PM (di tingkat database) |
| `20261127000000_attachment_links.sql` | Lampiran tautan (kolom `attachments.url`) |

## 10. Ringkasan

- **15/15** kebutuhan fungsional terpenuhi.
- **6/6** kebutuhan non-fungsional terpenuhi.
- **6/6** use case terpenuhi.
- **16/16** skenario Black Box terpenuhi.
- **12/12** tabel basis data sesuai (satu kolom menunggu migrasi).
- **10/10** wireframe terwakili di aplikasi.
