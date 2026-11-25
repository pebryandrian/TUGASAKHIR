# SPEC — Sumber Acuan Tunggal (Kode ↔ Skripsi)

> File ini adalah **satu-satunya acuan**. Setiap perubahan fitur di kode atau di dokumen skripsi
> harus dicek ke sini dulu, lalu file ini di-update. Tujuan: kode dan laporan tidak pernah beda cerita.

- Judul TA: **Pembangunan Aplikasi Work Management Berbasis Web (Studi Kasus: Invisual Studio)**
- Penulis: Pebry Andrian (22.304.0149)
- Repo yang dipakai: `TUGASAKHIR` (`github.com/pebryandrian/TUGASAKHIR`), branch `development`
- Stack skripsi: Next.js + TypeScript + Tailwind CSS + Supabase (PostgreSQL + Auth)
- Metode: Prototyping (Communication → Quick Plan → Modeling Quick Design → Construction → Deployment & Feedback)

---

## 1. Fitur WAJIB menurut skripsi

Sumber: Bab 1 §1.4 Lingkup, Bab 3 Tabel 3.4, Bab 4 Tabel 4.1–4.2.

| # | Fitur | Definisi minimum |
|---|-------|------------------|
| F1 | Autentikasi | Login/logout aman (Supabase Auth), proteksi rute |
| F2 | Dashboard monitoring | Ringkasan: jumlah proyek aktif, tugas selesai, deadline terdekat, aktivitas tim |
| F3 | Workflow Kanban | Papan kolom status, **drag & drop** kartu antar status |
| F4 | Task management | Buat tugas: nama, deskripsi, prioritas, deadline, penanggung jawab |
| F5 | Project management | Kelola proyek + daftar anggota, calendar/timeline |
| F6 | Member management | Daftar anggota, penugasan (assignee), peran |
| F7 | Peran pengguna | **Project Manager** (akses penuh) vs **Member** (tugasnya sendiri) |

**Kolom Kanban menurut skripsi** (Bab 2 §2.1.5 & Tabel 4.1): `To Do → In Progress → Review → Done` (4 kolom).

**Atribut tugas**: nama tugas, deskripsi, status, prioritas, tenggat waktu, penanggung jawab.

---

## 2. Model data target (PostgreSQL / Supabase)

Rancangan awal untuk menggantikan data dummy. Nama tabel snake_case.

```
users        (id, name, email, role ENUM['project_manager','member'], avatar_url)
projects     (id, name, description, scope, progress, start_date, due_date)
project_members (project_id, user_id, role)
task_groups  (id, project_id, title, color, position)          -- grup/kelompok tugas
statuses     (id, project_id, label, color_code, position)     -- kolom Kanban (bisa dikustom)
tasks        (id, project_id, group_id, status_id, title, description,
              priority ENUM['low','medium','high'], due_date, assignee_id, position, checked)
comments     (id, task_id, author_id, body, created_at)
subtasks     (id, task_id, parent_id, text, done, position,
              assignee_id, status_id, due_date, priority)      -- parent_id = sub-subtask (nesting)
docs         (id, project_id, blocks JSONB, updated_at)         -- isi tab "Doc"
```

> Catatan: skripsi menyebut kolom Kanban tetap (To Do/In Progress/Review/Done). Kode kini sudah
> memakai 4 status baku tersebut (`initialStatusList`). Fitur tambah label kustom tetap ada sebagai
> pelengkap, tapi baku default = 4 kolom skripsi.

> **Migrasi yang perlu dijalankan manual** (di Supabase → SQL Editor) supaya assignee/status/due
> date/priority pada baris subtask bisa disimpan: `supabase/migrations/20261113000000_subtask_meta.sql`.
> Sebelum migrasi dijalankan, kolomnya kosong & edit subtask tidak tersimpan; UI menampilkan
> peringatan di Main Table dan menolak perubahan (bukan error mentah). Deteksi kolom ada di
> `getSubtaskColumns()` (`lib/db.ts`).
> Isi file migrasinya:
> ```sql
> alter table public.subtasks
>   add column if not exists assignee_id uuid references public.profiles (id) on delete set null,
>   add column if not exists status_id   uuid references public.statuses (id) on delete set null,
>   add column if not exists due_date    date,
>   add column if not exists priority    text;
>
> notify pgrst, 'reload schema';
> ```

**Implementasi nyata (Supabase, sudah jalan):** `profiles` (ekstensi `auth.users`), `workspaces`,
`workspace_members`, `projects`, `project_members`, `task_groups`, `statuses`, `tasks`, `subtasks`,
`attachments`, `comments`, `docs`. Semua ber-RLS berbasis keanggotaan project (helper
`is_project_member` / `is_project_manager` / `is_workspace_member` / `is_workspace_owner`).
Trigger: `on_auth_user_created` (bikin `profiles`), `projects_seed` (4 status + 1 grup + 1 doc),
`projects_owner_member` (owner jadi `project_manager`), `docs_touch` (`updated_at`).

---

## 3. Peta fitur: skripsi ↔ kode (status saat ini)

Berdasarkan audit kode `app/`.

| Fitur | Skripsi minta | Kode sekarang | Status |
|-------|---------------|---------------|--------|
| F1 Autentikasi | Landing, registrasi, login, logout, reset, proteksi rute | `app/page.tsx` (landing), `app/signin` (signup/login/reset + Google); **login lewat server action** (`app/signin/actions.ts`) sesuai Gambar 4.13; `proxy.ts`; **Remember me** mengatur masa berlaku cookie | ✅ Nyata |
| F2 Dashboard monitoring | Home = Scope of Work + progres tugas + My Member | Sapaan, grid Scope of Work dengan progres `selesai/total` dari `tasks`, tabel My Member dari `profiles` | ✅ Nyata |
| F3 Pengelolaan proyek | Buat, ubah, hapus, favorit, jadwal | `createProject`, `updateProject` (nama, deskripsi, `start_date`, `due_date`), `deleteProject`, favorit di `project_members.favorite` | ✅ Nyata |
| F4 Pengelolaan anggota | Tambah anggota + peran | **Halaman Anggota Proyek** `/project/<scope>/<card>/members`: undang via email + pilih peran, ubah peran, keluarkan anggota | ✅ Nyata |
| F5 Pengelolaan tugas | CRUD tugas + atribut | Create/rename/deskripsi/prioritas/tanggal/assignee + subtask + komentar tersimpan di Supabase | ✅ Nyata |
| F6 Pengelolaan subtask | Subtask bertingkat dengan meta | Subtask bertingkat + assignee/status/tenggat/prioritas (`subtasks` 10 kolom) | ✅ Nyata |
| F7 Alur kerja | 4 status baku + ubah status + atur kolom status | Main Table + **Kanban** drag & drop → `tasks.status_id`; ikon gear di header kolom Status (khusus PM) membuka **Manage Status Labels** | ✅ Nyata |
| F8 Pengelompokan tugas | Grup + warna | `task_groups` dengan color & position | ✅ Nyata |
| F9 Kalender proyek | Bulanan + agenda | Tab Calendar dengan mode Month/Agenda, filter, sort, legenda status | ✅ Nyata |
| F10 Gantt & Chart | Timeline + distribusi status | Tab tambahan Gantt & Chart (tombol `+`) | ✅ Nyata |
| F11 Dokumen proyek | Editor + gambar/berkas + autosave | Editor blok; gambar & berkas diunggah ke bucket `project-docs`, autosave ke `docs.blocks` | ✅ Nyata |
| F12 Komentar & lampiran | Komentar bertingkat + unggah lampiran | Komentar bertingkat + like; lampiran ke bucket `task-attachments`, dibuka via signed URL | ✅ Nyata |
| F13 Hak akses | PM vs Member | `lib/permissions.ts` (`project_members.role`, owner = PM); badge peran; gating tombol; RLS diperketat | ✅ Nyata |
| F14 Profil | Nama, foto, kata sandi | `/profile`: ubah nama, foto ke bucket `avatars`, ganti kata sandi | ✅ Nyata |
| F15 Pengelolaan workspace | Buat, ubah nama, hapus, pilih aktif | `WorkspaceSelector` (create/rename/delete) + mode terkendali; workspace aktif menyaring `listProjects(workspaceId)` | ✅ Nyata |
| — Backend | Supabase/PostgreSQL | 12 tabel + RLS + trigger; `@supabase/ssr`; lapisan data `lib/db.ts` | ✅ Nyata |
| — Doc editor | (tidak diminta khusus) | Editor kaya (bold, list, image, file, undo/redo), isi tersimpan sebagai JSONB | ✅ ekstra, di luar skripsi |

**Bonus di luar skripsi (jangan diangkat sebagai fitur inti kecuali diminta):** editor Doc, color picker label ala Monday, export CSV, sort/filter lanjutan.

---

## 4. Status dokumen skripsi
**Acuan aktif: `LaporanTA-PebryAndrian-revisi15.docx`** (14 Nov 2026, 4,91 MB) — berada di
folder induk `TUGASAKHIR/`, bukan di `invisual/docs/`. Salinan `revisi2.docx` & `revisi3.docx`
di `invisual/docs/` adalah versi lama (0,6–0,8 MB) dan **tidak dipakai lagi**. `revisi13` juga
sudah digantikan `revisi15`.

**Audit konsistensi laporan ↔ kode: `docs/audit-konsistensi-laporan.md`** (14 Nov 2026).
Dokumen itu memetakan F-01…F-15, NF-01…NF-06, UC-01…UC-07, 12 tabel basis data, dan 16
skenario Black Box (Tabel 3.5) ke kondisi nyata kode beserta bukti teknis.

| Bagian | Kondisi | Perlu |
|--------|---------|-------|
| Bab 1 Pendahuluan | ✅ lengkap (6 tahap: Prototyping + WSF) | — |
| Bab 2 Landasan Teori | ✅ lengkap (+ Tabel 2.1 WSF, Tabel 2.2 penelitian terdahulu) | — |
| Bab 3 Skema Penelitian | ✅ lengkap (WSF, fishbone, skema analisis, Tabel 3.5 black box) | — |
| Bab 4 Analisis & Perancangan | ✅ lengkap (kebutuhan F/NF, use case, arsitektur, ERD, kamus data, activity, sequence, UI) | — |
| Bab 5 Implementasi & Evaluasi | ❌ kosong | Hasil implementasi, screenshot, hasil Black Box, evaluasi |
| Bab 6 Kesimpulan & Saran | ❌ kosong | Isi kesimpulan + saran |
| Daftar Pustaka | ✅ 19 entri, semuanya dirujuk | — |
| Lampiran | ✅ Lampiran 1 (skrip SQL), Lampiran 2 (kode `lib/db.ts`) | — |

**Perbaikan yang sudah dilakukan pada `revisi3`:**
- Tabel 3.1 disamakan menjadi **6 tahap** (sebelumnya 7) agar cocok dengan Gambar 1.1 dan Subbab 1.5.
- Kunci sitasi dibetulkan: `[NOR23]` → `[NOV23]`, `[PRE21]` → `[PRA21]`.
- Sitasi ditambahkan pada Tabel 2.2 sehingga seluruh entri Daftar Pustaka dirujuk.

**Sisa yang belum beres:**
- Daftar Isi belum memuat BAB 5 dan BAB 6 (memang belum ditulis; tambahkan saat bab itu dibuat).
- Nomor halaman pada Daftar Isi/Tabel/Gambar memakai field `PAGEREF`. Perlu diperbarui di Word
  (Ctrl+A lalu F9) setiap kali isi berubah, sebelum dicetak.

---

## 5. Keputusan terbuka (harus diputuskan sebelum lanjut koding)

- **D1 — Kanban vs Tabel: ✅ DIPUTUSKAN** — tambahkan view Kanban ke project ini (skripsi tetap).
  Status baku diselaraskan ke 4 kolom: `To Do → In Progress → Review → Done`.
- **D2 — Fix vs tambah:** bereskan dulu ketidakkonsistenan dokumen (§4) sambil menambahkan fitur,
  atau fokus fitur dulu baru dokumen. → *sedang berjalan: fitur dulu.*
- **D3 — Backend: ✅ SELESAI** — Supabase project `aefbqpbmsqgfhjyqhzmt` (region ap-southeast-1).
  Skema 12 tabel + RLS + trigger, Auth nyata, dan halaman tersambung ke DB. Verifikasi:
  `npx tsc --noEmit` bersih, `next build` sukses, `node scripts/db-check.mjs` PASS.

---

## 7. Riwayat perubahan

- **2026-11-25** – Penyesuaian dengan **`LaporanTA-PebryAndrian-revisi22.pdf`** (23 Nov 2026,
  76 halaman; acuan terbaru). Lima ketidaksesuaian diperbaiki:
  (a) **Gantt & Chart menjadi tab tetap** (`customViews` awal berisi keduanya) — Tabel 3.5 #12
  menyebut "membuka tab Gantt dan Chart", sebelumnya harus ditambah manual lewat `+`.
  (b) **Warna grup dipilih PM**: modal Tambah Grup Tugas mendapat 20 pilihan warna + pratinjau;
  sebelumnya warna diambil otomatis dari daftar tetap — Tabel 3.5 #11.
  (c) **Form proyek baru memuat deskripsi & jadwal**: `createProject` menerima `start_date` dan
  `due_date`, modal Create New Scope mendapat kolom Deskripsi, Tanggal Mulai, dan Tenggat, plus
  validasi nama kosong dan tenggat < tanggal mulai — UC-01 langkah 4.
  (d) **Daftar proyek mengikuti workspace aktif**: `listProjects()` kembali menyaring ketat; agar
  konsisten, kelima proyek contoh disatukan pada satu workspace "INVISUAL STUDIO" dan akun Member
  didaftarkan sebagai anggotanya — Tabel 3.5 #16.
  (e) **Pembuatan tugas hanya untuk PM**: `ProjectPermissions.createTasks`; tombol New item,
  `+` per grup, dan Add task Kanban hanya untuk PM; `openNewItemModal` menolak lebih dulu —
  UC-03 (aktor Project Manager).
  (f) **My Member untuk kedua aktor**: F-02 & UC-05 menyebut My Member untuk PM dan Member,
  sedangkan UC-06 menyebut Member membuka daftar tugas. Markup diekstrak menjadi
  `renderMyMember(readOnly)`; Member kini melihat **Tugas Saya lalu My Member (hanya lihat)**.
  (g) **Dokumen audit** `docs/audit-konsistensi-laporan.md` ditulis ulang dengan acuan revisi22
  (15 F, 6 NF, 6 UC, 12 tabel, 16 skenario, 10 wireframe) beserta daftar migrasi yang belum
  dijalankan. Fitur di luar laporan (alur undangan, kolom Files/Notes, dropdown peran di Home,
  menu History, tombol Muat contoh) dipertahankan atas permintaan pemilik.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; uji UI di Edge headless — PM melihat
  5 scope, form proyek berisi 4 kolom, tab Gantt/Chart ada, form grup menampilkan 20 warna;
  Member tidak melihat New Scope/New item/Add task, tetapi melihat Tugas Saya + My Member.
  Catatan: revisi22 berhenti di BAB 4 (BAB 5 dan 6 belum berisi).

- **2026-11-24** – Kolom **Files** dan **Notes** di Main Table kini bisa diisi.
  (a) **Kolom tampil default**: `extraColumns` awal `['Priority', 'Files', 'Notes']`, sehingga kedua
  kolom langsung tersedia tanpa harus menambah manual. Pilihan kolom tetap disimpan per project
  (`localStorage` kunci `invisual.table-columns.<projectId>`), jadi kolom yang pernah ditambahkan
  tidak hilang setelah halaman dimuat ulang.
  (b) **Files**: sel menampilkan jumlah lampiran; klik membuka popover `TablePopover` berisi daftar
  berkas/tautan (buka & hapus per item), tombol **Unggah berkas** (Supabase Storage bucket
  `task-attachments`), dan form **Tautan (Google Drive)** — nama opsional + URL. Tautan
  dinormalisasi (`normalizeLink`, `https://` ditambahkan bila belum ada) dan divalidasi.
  (c) **Notes**: klik sel membuka popover berisi textarea; tersimpan pada kolom
  `tasks.description` (sama dengan bagian Description pada panel detail tugas) lewat `updateTaskRow`.
  (d) **Lampiran berupa tautan**: `addAttachmentLink()` menyimpan ke kolom baru `attachments.url`
  bila migrasi dijalankan; sebelum itu memakai mode kompatibilitas `storage_path = 'link:<url>'`
  (`isLinkPath`, `linkUrlFromPath`), sehingga fitur tetap bisa dipakai. `loadBoard` membaca kolom
  `url` hanya bila tersedia, dan `deleteAttachmentWithFile` tidak menghapus objek Storage untuk
  lampiran bertipe tautan.
  (e) **Migrasi baru** `supabase/migrations/20261127000000_attachment_links.sql`: kolom
  `attachments.url`, `storage_path` boleh kosong, constraint "berkas atau tautan", dan pemindahan
  data `link:` lama ke kolom `url`.
  (f) **Kegagalan simpan tidak lagi diam**: `updateTask` memakai `.select('id')` dan melempar
  `NOT_ALLOWED_TASK_UPDATE_MESSAGE` bila 0 baris (RLS membatasi Member pada tugas yang ditugaskan
  kepadanya). Pesan tampil di popover Notes, bukan gagal senyap.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses. Uji langsung ke Supabase: lampiran tautan
  tersimpan & terbaca untuk akun PM maupun Member (kolom `url` belum ada → mode `link:`), lalu
  dihapus kembali. Uji UI di Edge headless: kolom Files & Notes tampil, popover Files menampilkan
  input tautan + tombol unggah, "Dokumen Drive Uji" berhasil tersimpan dan muncul di daftar, popover
  Notes memuat isi deskripsi tugas dan bisa disimpan; hanya satu popover terbuka pada satu waktu.

- **2026-11-24** – Popover sel di Main Table (Status, Tanggal, Person, subtask) tertimpa & terpotong.
  (a) **Masalah**: popover sel masih memakai `position: absolute` di dalam sel tabel. Akibatnya
  (1) **tertimpa** kolom/sel lain karena setiap `<td>` punya `position: relative` sendiri,
  (2) **terpotong** container tabel ber-`overflow-x-auto`, (3) bisa **keluar layar** pada baris
  paling bawah.
  (b) **Perbaikan**: komponen baru `TablePopover` — popover dirender lewat `createPortal` ke
  `<body>` dengan posisi `fixed` (z-index 141), dihitung dari posisi elemen pemicu, otomatis
  membuka **ke atas** bila ruang bawah kurang, dan selalu di dalam batas layar. Dipakai oleh
  Status, Tanggal, dan sel meta subtask (assignee/status/tanggal). `AssigneeMenu` disamakan
  (menerima anchor berupa kotak elemen, bukan titik) agar bisa membuka ke atas.
  (c) **Satu popover saja**: `closeAllCellPickers()` dijalankan sebelum membuka popover baru,
  sehingga Status/Tanggal/Person/Subtask tidak bisa terbuka bersamaan lalu saling menutupi.
  (d) **Mengikuti scroll**: popover tidak ditutup saat tabel digulir (karena `scroll-behavior:
  smooth` memicu event scroll tepat saat dibuka) tetapi posisinya dihitung ulang mengikuti elemen
  pemicu lewat `requestAnimationFrame`.
  Verifikasi langsung di Edge headless (CDP): jumlah popover terbuka selalu 1; titik sampel di
  dalam popover benar-benar mengenai popover (`elementFromPoint`); posisi selalu di dalam layar;
  setelah `main` digulir 200px popover tetap 6px di bawah sel; popover Person tidak keluar layar.

- **2026-11-24** – Sidebar kiri dipastikan punya scroll sendiri (Home & board).
  (a) **Pengukuran langsung**: halaman diuji di Edge headless (CDP) pada lebar 1920, 1600, 1440,
  1366, 1280, dan 1100 px. Hasilnya: tinggi dokumen = tinggi layar (tidak ada scroll halaman),
  `<main>` yang menggulir (`scrollHeight` 1299 > `clientHeight` 744), dan posisi `<aside>` tetap
  (top 64 → 64) baik saat `<main>` digulir maupun saat `window` digulir.
  (b) **Penguatan**: sidebar diberi `lg:sticky lg:top-16` + `lg:h-[calc(100dvh-4rem)]
  lg:self-start lg:overscroll-contain` (Home dan board). Efeknya dua lapis: pada kondisi normal
  (hanya `<main>` menggulir) sticky tidak berpengaruh; bila halaman yang menggulir — mis. CSS lama
  masih ter-cache atau tinggi jendela tidak terduga — sidebar tetap menempel di bawah header.
  (c) **Bukti**: uji "fallback" (memaksa tinggi dokumen menjadi auto sehingga halaman menggulir
  628 px) menunjukkan posisi sidebar tetap di 64 px; saat isi sidebar lebih tinggi dari layar
  (jendela 380 px) sidebar memiliki scroll sendiri (`scrollHeight` 532 > `clientHeight` 224) dan
  posisinya tidak berubah.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; `/home` dan `/project/client/aqua`
  (PM dan Member) balas 200.

- **2026-11-24** – Halaman board (Main Table): sidebar tidak ikut ter-scroll.
  (a) **Perubahan layout**: sama seperti Home — akar halaman memakai
  `min-h-screen lg:h-screen lg:overflow-hidden`, baris konten `lg:min-h-0`, sidebar
  `lg:h-full lg:overflow-y-auto lg:overflow-x-hidden`, dan `<main>` `lg:min-h-0`. Dengan
  demikian hanya area konten (Main Table, Kanban, Gantt, Chart, Doc) yang menggulir,
  sementara sidebar kiri dan header atas tetap di tempat. Di layar kecil (HP) tata letak
  bertumpuk seperti sebelumnya.
  (b) **Dropdown workspace di sidebar board**: karena sidebar kini punya scroll sendiri,
  dropdown yang tadinya `position: absolute` di dalamnya akan terpotong. Dropdown dipindah
  ke `createPortal` ke `<body>` dengan posisi `fixed` yang dihitung dari tombol pemicu
  (selalu di dalam layar), ditutup otomatis saat di-scroll/resize, dan footer-nya dirapikan
  (label "Hanya PM" + tooltip) agar tidak terpotong.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; `/project/client/aqua` (PM dan
  Member) serta halaman Anggota Proyek balas 200.

- **2026-11-24** – Dropdown workspace terpotong di sidebar.
  (a) **Penyebab**: agar sidebar tidak ikut ter-scroll, sidebar diberi `overflow-y-auto`. Dropdown
  dan menu `⋯` pada `WorkspaceSelector` masih memakai `position: absolute` di dalam sidebar,
  sehingga **terpangkas** oleh container ber-overflow itu (hanya terlihat beberapa baris), dan
  sidebar ikut tergeser ke samping karena isi dropdown (286px) lebih lebar daripada sidebar (224px).
  (b) **Perbaikan**: kedua popup dirender lewat `createPortal` ke `<body>` dengan posisi `fixed`
  yang dihitung dari posisi tombol pemicu (otomatis membuka ke atas bila ruang bawah kurang, dan
  tetap di dalam layar). Popup ditutup saat halaman/sidebar di-scroll atau ukuran jendela berubah,
  supaya posisinya tidak melenceng.
  (c) Footer dropdown dirapikan: tombol tidak lagi terpotong, label untuk Member dipendekkan menjadi
  "Hanya PM" (dengan tooltip penjelasan), dan sidebar diberi `lg:overflow-x-hidden` agar tidak ada
  geser horizontal.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; `/home` dan `/profile` balas 200 untuk
  akun PM maupun Member.

- **2026-11-24** – Workspace dan pembuatan project/scope hanya untuk Project Manager.
  (a) **Masalah**: Member masih melihat dan memakai tombol *Add Workspace*, menu `⋯`
  (rename/delete workspace), *New Scope*, *Muat contoh*, dan *New Card*.
  (b) **Aturan** (`canCreateProject()` di `lib/db.ts`): boleh bila pengguna Project Manager pada
  minimal satu project, **atau** belum tergabung di project mana pun (pendaftar baru, supaya tidak
  terkunci di Home kosong). Member yang sudah tergabung di project tidak boleh.
  (c) **UI**: `WorkspaceSelector` menerima prop `canManage` (Home & Profil) — tombol Add Workspace
  dan menu `⋯` disembunyikan, diganti keterangan "Hanya Project Manager". Home menyembunyikan
  *Muat contoh*, *New Scope*, dan *New Card* (termasuk pada keadaan kosong); board menyembunyikan
  tombol `+` Add Workspace di header. Semua handler (`handleSeedDemo`, `handleCreateScope`,
  `openNewCardModal`, `handleCreateCard`, serta create/rename/delete workspace) menolak lebih dulu
  dengan pesan jelas.
  (d) **Pengaman database**: migrasi baru
  `supabase/migrations/20261126000000_workspace_scope_manager_only.sql` —
  `invisual_can_manage_projects()` + policy tulis `workspaces` (insert/update/delete) dan
  `projects` insert hanya untuk PM; policy tulis lama yang longgar dibuang.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; uji langsung ke Supabase —
  `canCreate` = true untuk PM, **false** untuk Member, true untuk akun baru; setelah migrasi
  dijalankan, Member ditolak RLS saat membuat project/workspace. `/home`, `/profile`, dan board
  balas 200 untuk kedua akun; PM dan Member tetap melihat **5 scope**.

- **2026-11-24** – Ikon orang pada kartu project di Scope Of Work dikembalikan.
  (a) **Penyebab hilang**: permintaan sebelumnya ("hilangkan ikon orang pada Scope Of Work di
  Home") diterapkan pada **dua** tempat sekaligus — kartu *scope* dan kartu *project* di dalam modal
  Scope Of Work — beserta penghapusan `MemberStack`, `listProjectMemberChips`, dan state
  `projectMembers`.
  (b) **Perbaikan**: ikon orang dikembalikan **hanya pada kartu project** (tumpukan avatar maksimal
  5 + "+N", beserta jumlah orang, dan label "Belum ada anggota" bila kosong). Kartu *scope* di
  halaman utama tetap ringkas tanpa ikon, sesuai permintaan sebelumnya.
  `listProjectMemberChips()` kembali di `lib/db.ts` dan hanya menghitung anggota `status = 'active'`.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; data per project terbaca (Aqua, Glowup,
  Nusantara, Grotesk, Arunika = 2 orang; Unheir = 1 orang) untuk akun PM maupun Member;
  `/home` dan board balas 200.

- **2026-11-24** – My Member: Project Manager dapat mengubah peran anggota.
  (a) **Daftar**: semua pengguna yang mendaftar otomatis masuk **My Member** dengan peran default
  **Member** (kolom `profiles.role` default `'member'`, baris dibuat oleh trigger saat sign up).
  (b) **Ubah peran**: kolom *Role* pada tabel My Member menjadi dropdown dengan **dua pilihan saja**
  — `Member` dan `Project Manager`. Baris milik sendiri tidak bisa diubah (ditandai "Anda").
  Pilihan tervalidasi lagi di `updateTeamMemberRole` (menolak peran lain dan menolak mengubah
  peran sendiri).
  (c) **Peran efektif**: yang ditampilkan adalah peran yang benar-benar berlaku pada project yang
  dikelola PM (`listTeamRoles`), dengan `profiles.role` sebagai cadangan. Perubahan diterapkan ke
  baris `project_members` di project yang dikelola PM (langsung berpengaruh pada hak akses) dan
  `profiles.role` sebagai peran default. PM tidak bisa menurunkan peran pada project milik orang
  tersebut.
  (d) **Migrasi baru** `supabase/migrations/20261125000000_team_member_roles.sql`: kolom
  `profiles.role` + check constraint dua nilai, policy `profiles_update_manager` (PM boleh mengubah
  peran anggota), dan trigger `trg_profiles_guard_role_update` yang membatasi PM hanya pada kolom
  `role` serta melarang siapa pun mengubah perannya sendiri. Sebelum migrasi dijalankan, perubahan
  tetap berhasil untuk anggota yang sudah tergabung di project PM; untuk pengguna tanpa project
  muncul pesan agar migrasi dijalankan.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; uji langsung ke Supabase — promosi dan
  pengembalian peran anggota pada 2 project PM berhasil (2 baris berubah, lalu dikembalikan);
  `/home` dan halaman Anggota Proyek balas 200.

- **2026-11-24** – Penanggung jawab tugas hanya bisa diubah Project Manager (F-13).
  (a) **Masalah**: kolom *Person* (Main Table), panel detail tugas, dan pemilih penanggung jawab
  subtask bisa diubah siapa pun, termasuk Member. Pembagian tugas adalah wewenang PM.
  (b) **Perbaikan izin**: `ProjectPermissions` menambah `assignTasks` (PM `true`, Member `false`).
  `toggleTaskAssignee` dan `clearTaskAssignee` menolak lebih dulu dan menampilkan pesan
  "Hanya Project Manager yang dapat mengubah penanggung jawab tugas."
  (c) **Perbaikan tampilan**: untuk Member, kolom *Person* di Main Table, baris *Person* pada panel
  detail, dan avatar penanggung jawab subtask dirender **tanpa tombol/menu** (hanya teks + avatar);
  modal New Item menampilkan "Ditetapkan oleh Project Manager" alih-alih pemilih anggota, sehingga
  tugas yang dibuat Member tersimpan tanpa penanggung jawab.
  (d) **Pengaman database**: migrasi baru
  `supabase/migrations/20261124000000_assignee_manager_only.sql` menambah trigger
  `trg_tasks_guard_assignee` dan `trg_subtasks_guard_assignee` yang menolak perubahan kolom
  `assignee_id` bila pelakunya bukan PM/pemilik project. Perubahan lain (status, centang selesai,
  deskripsi, komentar, lampiran) tetap boleh dilakukan Member.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses, board PM dan Member balas 200.

- **2026-11-24** – Scope Of Work hanya menampilkan 3 dari 5 scope, dan sidebar ikut ter-scroll.
  (a) **Penyebab 3 scope**: `listProjects(workspaceId)` memakai `.eq('workspace_id', …)`, sedangkan
  project contoh tersebar di **dua workspace** (project PM di workspace PM, project Member di
  workspace Member). Workspace yang tidak terlihat oleh pengguna membuat project di dalamnya ikut
  hilang, sehingga Member hanya melihat Mockup, Studio Project, dan Font. Perbaikan: filter
  workspace kini hanya diterapkan pada project yang workspace-nya **terlihat** oleh pengguna;
  project di workspace yang tidak terjangkau (dan project tanpa workspace) tetap ditampilkan.
  Hasil: akun PM melihat 6 project dan akun Member 5 project, keduanya **5 scope**
  (Client, Font, Marketplace, Studio Project, Mockup).
  (b) **History** (localStorage) menyimpan entri lama yang menunjuk project yang sudah berganti
  nama/scope (`Studio Client` → `Studio Project`) atau sudah dihapus. Setelah project dimuat,
  entri dibersihkan dan judulnya diselaraskan dengan database, sehingga tautannya tidak mati.
  (c) **Sidebar tidak ikut ter-scroll**: layout Home diubah menjadi tinggi tetap di layar besar
  (`lg:h-screen lg:overflow-hidden`) sehingga hanya `<main>` yang menggulir; sidebar punya
  `lg:overflow-y-auto` sendiri. Tombol *Home* di sidebar menggulir `main`, bukan hanya `window`.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; uji langsung ke Supabase menunjukkan
  PM dan Member sama-sama memperoleh 5 scope; `/home` dan board balas 200.

- **2026-11-24** – Scope Of Work: ikon orang dihapus, template jadi 5 scope tetap.
  (a) **Ikon orang dihapus**: tumpukan avatar anggota (`MemberStack`, `listProjectMemberChips`,
  state `projectMembers`) dibuang dari kartu scope maupun kartu project di modal Scope Of Work.
  Kartu kembali ringkas: gambar, nama scope/project, jumlah card, dan progress. Pemeriksaan peran
  (`listProjectRoles`) tetap dipakai untuk menyembunyikan tombol Ubah/Hapus dari Member.
  (b) **Template 5 scope**: `demoProjects` di `lib/project-template.json` diubah dari
  "Studio Client" menjadi **"Studio Project"**, sehingga template tepat berisi lima scope:
  **Client, Font, Marketplace, Studio Project, Mockup**. Home juga mengurutkan kartu scope sesuai
  urutan itu (`SCOPE_ORDER`), dan gambar kartu dipetakan **per nama scope** (`SCOPE_IMAGES`)
  sehingga tidak lagi bergantung urutan kemunculan project.
  (c) Data lama dimigrasikan: project dengan scope "Studio Client" (Arunika) diubah menjadi
  "Studio Project" lewat akun PM.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; scope unik di database untuk akun PM
  maupun Member = Client, Font, Marketplace, Mockup, Studio Project; `/home` dan
  `/project/studio-project/arunika` membalas 200.

- **2026-11-24** – Ikon anggota pada Scope Of Work + tombol Ubah/Hapus project khusus Project Manager.
  (a) **Ikon orang**: `listProjectMemberChips()` mengumpulkan anggota **aktif** per project
  (`project_members` + `profiles`, undangan `status = 'invited'` tidak dihitung). Home
  menampilkannya sebagai tumpukan avatar (maks. 4 + "+N") pada setiap kartu project di modal
  Scope Of Work, dan gabungan anggota per scope pada kartu scope di halaman utama beserta jumlah
  orang.
  (b) **Hak ubah/hapus**: Home kini memuat `listProjectRoles()` (pemilik project = Project Manager,
  selain itu `project_members.role`). Tombol *Ubah* dan *Hapus* hanya tampil bila peran pada
  **project itu** adalah Project Manager; Member hanya melihat tombol favorit. Pengaman tambahan:
  `openEditProject`, `handleSaveProject`, `handleDeleteProject` menolak, dan `updateProject`/
  `deleteProject` di `lib/db.ts` memeriksa peran lewat `assertProjectManager` sehingga menampilkan
  pesan jelas "Hanya Project Manager yang dapat mengubah atau menghapus project ini."
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; data peran diuji langsung — akun PM
  mendapat `project_manager` pada 6 project, akun Member mendapat `member` pada 5 project;
  `/home` dan board membalas 200 untuk kedua akun.

- **2026-11-24** – Perbaikan penanggung jawab tugas ("Person") tidak bisa diubah.
  (a) **Penyebab tampak**: semua akun demo belum punya `avatar_url`, dan pemetaan board memakai
  satu gambar placeholder yang sama (`/images/clients/SUNDDAE.jpg`) untuk semua anggota. Kolom
  *Person* di Main Table hanya menampilkan avatar, sehingga mengganti penanggung jawab **tidak
  terlihat berubah sama sekali**.
  (b) **Penyebab nyata kedua**: `toggleTaskAssignee` selalu menambahkan anggota kembali
  (`newNames.length > 0 ? newNames : [member.name]`), jadi penugasan tidak pernah bisa dilepas,
  dan penghapusan avatar memakai `filter` berdasarkan nilai sehingga menghapus avatar anggota lain
  yang kebetulan sama.
  (c) **Perbaikan**: komponen `PersonAvatar` (foto bila ada, selain itu inisial + warna tetap per
  nama) dipakai di Main Table, Kanban, detail tugas, pemilih anggota, dan daftar mention. Kolom
  *Person* kini menampilkan avatar **dan nama** (atau tombol "Tugaskan" bila kosong).
  `toggleTaskAssignee` disamakan dengan skema database (satu `tasks.assignee_id` per tugas):
  memilih anggota lain menggantikan, memilih anggota yang sama melepas; ditambah aksi
  "Tanpa penanggung jawab" (`clearTaskAssignee`).
  (d) Menu pemilihan penanggung jawab dipindah ke `AssigneeMenu` yang dirender lewat
  `createPortal` ke `<body>`, jadi tidak lagi terpotong oleh container `overflow-x-auto`
  (tabel Main Table) atau area scroll modal detail, serta selalu di atas modal.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses, halaman board PM/Member,
  Anggota Proyek, dan `/home` balas 200.

- **2026-11-24** – Perbaikan "Gagal memuat board".
  (a) **Penyebab**: kolom `invited_by` (FK ke `profiles`) yang ditambahkan untuk fitur undangan
  membuat `project_members` punya **dua** relasi ke `profiles` (`user_id` dan `invited_by`).
  PostgREST menolak embed tanpa nama constraint ("more than one relationship was found"), dan
  query itu dipakai `loadBoard()` sehingga seluruh board gagal dimuat.
  (b) **Perbaikan**: embed memakai nama constraint eksplisit
  `profiles!project_members_user_id_fkey(...)` di `loadBoard()` dan `listProjectMembers()`.
  Nama constraint `user_id` sudah ada sejak awal, jadi perbaikan berlaku sebelum maupun sesudah
  migrasi undangan.
  Verifikasi: seluruh query board (project, statuses, task_groups, tasks, members, docs,
  subtasks, attachments, comments) berhasil untuk akun PM dan Member;
  `/project/client/aqua`, `/project/client/aqua/members`, dan `/home` balas 200.

- **2026-11-24** – Perbaikan login tidak bisa dipakai.
  (a) **Penyebab**: login dipindah ke server action (`app/signin/actions.ts`) tetapi cookie sesi
  Supabase (≈2.9 KB) tidak ikut terkirim ke browser, sehingga sesi tidak pernah terbentuk dan
  `/home` selalu berbalik ke halaman login.
  (b) **Perbaikan**: login ditangani route handler `POST /api/auth/signin`
  (`app/api/auth/signin/route.ts`). Kredensial divalidasi di server, diverifikasi Supabase Auth
  (dengan 3× percobaan ulang bila jaringan gagal sesaat), lalu cookie sesi ditulis **eksplisit**
  ke `NextResponse` (`response.cookies.set`), bukan hanya ke `cookies().set`. Form login
  memanggil endpoint ini. `app/signin/actions.ts` dihapus.
  (c) `/signin` menampilkan form login (default `initialMode` = `login`), `/signup` form daftar.
  (d) Home: `isManager` awalnya `null` (menampilkan "Memuat…") agar Member tidak sempat melihat
  bagian "My Member" sebelum peran diketahui.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses (13 rute + `/api/auth/signin`), login
  kedua akun demo mengembalikan 200 dengan 1 cookie sesi dan `/home` balas 200.

- **2026-11-23** – Alur undangan anggota + Home versi Member.
  (a) **Undangan**: `project_members` mendapat `status` (`invited`/`active`), `invited_by`,
  `invited_at` lewat migrasi `20261123000000_project_invitations.sql`. PM mengundang lewat
  halaman Anggota Proyek; anggota baru berstatus `invited` sampai menerima.
  (b) **Notifikasi**: panel Notification punya tab **Undangan** dengan tombol Terima/Tolak, dan
  ikon lonceng di Home menampilkan badge jumlah undangan yang menunggu. Menerima → `active`
  (project muncul di Home), menolak → baris keanggotaan dihapus.
  (c) **Home versi Member**: bagian **My Member** diganti **Tugas Saya** — kartu tugas yang
  ditugaskan kepadanya, diurutkan dari tenggat terdekat, dipisah menjadi "Perlu segera
  dikerjakan" (≤3 hari / terlambat) dan "Berikutnya", lengkap dengan prioritas, status,
  tenggat, dan progres subtask. `hasManagerRole()` memilih tampilan: PM → My Member,
  Member → Tugas Saya.
  (d) **RLS**: helper `is_project_member` hanya menghitung anggota berstatus `active`; anggota
  boleh menerima/menolak undangannya sendiri tetapi tidak boleh mengubah peran.
  (e) `listProjects()` menyembunyikan project yang undangannya belum diterima.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; uji langsung ke Supabase menunjukkan
  PM `isManager=true` dan Member `isManager=false` dengan 9 tugas (4 mepet deadline/terlambat).
  Data demo dirapikan: 3 project contoh yang sempat dimiliki akun Member dipindahkan ke akun PM.
  **Catatan:** alur undangan baru aktif setelah migrasi `20261123000000_project_invitations.sql`
  dijalankan; sebelum itu `addMemberByEmail` menambah anggota langsung seperti sebelumnya.

- **2026-11-23** – Akun contoh untuk membandingkan POV Project Manager vs Member.
  `scripts/seed-demo-accounts.mjs` membuat:
  **PM** `pm.demo@invisual.test` / `Manager2026!` (Rani Project Manager) dan
  **Member** `member.demo@invisual.test` / `Member2026!` (Bagas Anggota Tim).
  Keduanya anggota pada dua project contoh (Client/Aqua, Marketplace/Glowup); tugas yang punya
  penanggung jawab ditugaskan ke akun Member sehingga POV member langsung berisi.
  Verifikasi: PM memiliki kedua project sebagai owner, Member berperan `member` di keduanya dan
  melihat 13 tugas (6 ditugaskan kepadanya).
  Catatan: **migrasi `20261114000000_rls_roles.sql` belum dijalankan** — uji langsung menunjukkan
  member masih bisa menghapus/membuat grup dan menambah label status di database, walaupun
  tombolnya sudah disembunyikan di UI.

- **2026-11-23** – Perbaikan halaman login: `/signin` sebelumnya memakai `initialMode = 'signup'`
  sehingga menampilkan form daftar (pengguna mengira tidak bisa login). Default diubah ke
  `'login'` dan `/signup` kini eksplisit meminta mode signup.
  Verifikasi: `/signin` memuat "Hi, Welcome Back!", `/signup` memuat "Create Your Account",
  `/forgot-password` memuat "Reset Your Password" (ketiganya 200).

- **2026-11-14** – Menyesuaikan aplikasi dengan **`LaporanTA-PebryAndrian-revisi15.docx`**
  (laporan terbaru; revisi13 sudah digantikan).
  (a) **UC-01 / Gambar 4.13**: login dipindah ke **server action** (`app/signin/actions.ts`) —
  kredensial divalidasi di server lalu diverifikasi Supabase Auth, bukan lagi dipanggil langsung
  dari browser.
  (b) **UC-03**: dibuat **halaman Anggota Proyek** `/project/<scope>/<card>/members`
  (`components/project-members.tsx`) — undang via email + pilih peran, ubah peran, keluarkan
  anggota. Modal anggota & modal undang di board dihapus agar tidak ada dua implementasi.
  (c) **UC-05**: ikon gear pada header kolom **Status** (khusus PM) membuka **Manage Status
  Labels**, sehingga "mengatur kolom status pekerjaan" benar-benar dapat diakses.
  (d) **F-02**: kartu statistik + panel Deadline/Aktivitas di Home **dihapus** karena revisi15
  mendefinisikan Home hanya sebagai Scope of Work + My Member. Kode mati
  (`getDashboardStats`, `listUpcomingDeadlines`, `listRecentActivity`) ikut dibuang.
  (e) Migrasi baru `20261114000003_workspace_members_role.sql` (kolom `role` pada
  `workspace_members`, sesuai Tabel 4.6).
  Verifikasi: `tsc --noEmit` bersih; `next build` sukses dengan rute baru
  `/project/[scope]/[card]/members`; `/` dan `/signin` balas 200; `/home` dan halaman anggota
  balas 307 (proteksi rute) saat belum login.

- **2026-11-13** – Menyelaraskan aplikasi dengan **`LaporanTA-PebryAndrian-revisi13.docx`**
  (laporan terbaru, ada di folder induk `TUGASAKHIR/`). Audit sebelumnya memakai `revisi3.docx`
  di `invisual/docs/` yang sudah usang, sehingga sebagian temuan tidak relevan.
  (a) **F-15 Workspace aktif**: `WorkspaceSelector` menerima `value`/`onChange`; workspace aktif
  menyaring `listProjects(workspaceId)` dan dipakai saat membuat scope/card.
  (b) **F-03 Jadwal proyek**: modal Ubah Project menambah `start_date` dan `due_date`.
  (c) **F-01 Remember me**: checkbox dikembalikan dan benar-benar berfungsi lewat
  `cookieOptions.maxAge` (30 hari bila dicentang, cookie sesi bila tidak).
  (d) **F-14 Foto profil**: `uploadAvatar()` mengunggah ke bucket `avatars` lalu menyimpan URL
  publik; tidak lagi menyimpan base64 di kolom tabel.
  (e) **F-11 Berkas Doc**: `uploadDocFile()` mengunggah gambar & berkas ke bucket `project-docs`,
  blok menyimpan path dan ditampilkan lewat signed URL; blok "file" kini bisa memilih berkas
  sungguhan (sebelumnya hanya membuat blob teks contoh).
  (f) Migrasi baru `supabase/migrations/20261114000002_storage_avatars_docs.sql`.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses, jadwal proyek & filter workspace
  terbukti jalan lewat uji langsung ke Supabase. **Bucket Storage belum dibuat** — unggah
  ke `task-attachments`, `avatars`, dan `project-docs` masih gagal sampai ketiga migrasi
  dijalankan.

- **2026-11-13** – Menyelaraskan aplikasi dengan klaim `LaporanTA-...-revisi3.docx`:
  (a) **F-02 Dashboard monitoring** di `/home`: kartu jumlah proyek / total tugas / tugas selesai /
  anggota tim, panel **Deadline Terdekat**, dan **Aktivitas Terbaru** (tugas + komentar);
  fungsi `getDashboardStats`, `listUpcomingDeadlines`, `listRecentActivity` di `lib/db.ts`.
  (b) **F-03 Pengelolaan proyek**: `updateProject`, `deleteProject`, tombol ubah/hapus pada kartu
  project di modal Scope Of Work (hapus memakai dialog konfirmasi).
  (c) **F-13 Hak akses**: `lib/permissions.ts` (`useProjectPermissions`) membaca
  `project_members.role` dengan fallback owner = Project Manager; badge peran di breadcrumb board;
  tombol Add New Group / Add Column / hapus tugas / undang anggota hanya untuk PM; migrasi
  `supabase/migrations/20261114000000_rls_roles.sql` menutup lubang RLS dan menambah policy PM
  untuk ubah/hapus project serta ubah peran anggota.
  (d) **UC-03**: pilihan peran saat mengundang + modal **Anggota Project** untuk mengubah peran
  dan mengeluarkan anggota (`updateMemberRole`, `removeMember`).
  (e) **F-12 Lampiran**: `uploadAttachment` mengunggah berkas ke bucket `task-attachments`
  (Supabase Storage), metadata `storage_path` dicatat, dibuka lewat signed URL, dihapus beserta
  berkasnya; migrasi `20261114000001_attachments_storage.sql` membuat bucket + policy.
  (f) **Favorit** pindah dari `localStorage` ke kolom `project_members.favorite` sesuai kamus data
  Tabel 4.7 (`listFavoriteProjects`, `setProjectFavorite`).
  Verifikasi: `npx tsc --noEmit` bersih, `next build` sukses, `/` dan `/signin` balas 200;
  uji langsung ke Supabase membuktikan join `assignee`, query aktivitas, statistik, favorit
  (update baris owner), ubah project, ubah peran, dan hapus project berjalan; unggah berkas
  masih menunggu migrasi bucket (pesan error jelas bila belum dijalankan).

- **2026-11-13** – Perbaikan "Gagal menyimpan perubahan subtask" (`Could not find the 'status_id'
  column of 'subtasks' in the schema cache`). Penyebab: kolom meta subtask memang belum ada di DB.
  (a) Migrasi SQL disimpan di repo: `supabase/migrations/20261113000000_subtask_meta.sql`
  (assignee_id/status_id/due_date/priority + index + `notify pgrst`).
  (b) `getSubtaskColumns()` mendeteksi kolom yang benar-benar ada sekali per sesi; `updateSubtask`
  menyaring patch sehingga kolom yang belum ada tidak dikirim.
  (c) UI menampilkan banner kuning di Main Table + menolak perubahan sel yang belum didukung
  (tidak ada lagi perubahan yang tampak tersimpan lalu hilang setelah refresh).
  (d) Sidebar "Belum ada workspace" diperbaiki: `ensureDefaultWorkspace()` membuat workspace default
  (beserta baris `workspace_members`) bila akun belum punya, dipakai WorkspaceSelector, halaman
  project, dan `createProject` sehingga project baru selalu punya workspace.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses; uji langsung ke Supabase menunjukkan
  keempat kolom belum ada, penyaringan patch menghasilkan pesan migrasi (bukan error mentah),
  dan insert `workspace_members` oleh pemilik diizinkan RLS.

- **2026-11-13** – Template contoh project. Sumber data tunggal `lib/project-template.json`:
  (a) `template` generik (3 grup + 8 tugas + subtask + komentar + 6 blok Doc) dipakai saat
  project baru dibuat lewat `createProject(..., { template: true })`; (b) `demoProjects` berisi
  5 project siap pakai (Client/Aqua, Font/Grotesk, Marketplace/Glowup, Studio Project/Arunika,
  Mockup/Nusantara) yang dimuat lewat tombol **Muat contoh** di Home — dijalankan dari browser sebagai
  user yang login sehingga tetap tunduk pada RLS. Tanggal tugas memakai offset hari dari hari ini,
  jadi isi contoh selalu terlihat sedang berjalan. Board kosong menampilkan tombol
  **Isi contoh tugas**; modal Create New Card punya opsi "Sertakan contoh tugas".
  Verifikasi: `tsc --noEmit` bersih; uji insert ke Supabase (akun sementara) menghasilkan
  8 tugas / 7 subtask / 2 komentar / 6 blok Doc lalu data uji dihapus kembali.

- **2026-11-12** – Perbaikan konsistensi frontend (data contoh dihapus, semua kontrol aktif):
  (a) `findProject` mencocokkan **slug** URL dengan `scope`/`name` di database, sehingga kartu
  project benar-benar membuka board-nya (sebelumnya selalu gagal dan jatuh ke data contoh);
  (b) hapus fallback demo di board (`initialGroups`/`initialMembers`/`initialDocBlocks`,
  workspace `seed-*`, `CURRENT_USER`) dan di Home (scope/kartu/member contoh);
  (c) tab **Kanban** dipulihkan: 4 kolom + drag & drop native, tersimpan ke `tasks.status_id`;
  (d) autosave tab Doc tidak lagi jalan sebelum dokumen selesai dimuat (tidak menimpa isi DB
  dengan dokumen kosong);
  (e) Home: profil & tanggal nyata, favorit tersimpan di `localStorage`, **My Member** dibaca dari
  `profiles` dengan search + sort berfungsi, progress kartu dihitung dari `tasks`;
  (f) Profile: email & role read-only, **ubah password** berfungsi, kegagalan simpan ditampilkan;
  (g) `prompt()`/`confirm()`/`alert()` diganti modal (tambah grup, hapus massal, undang anggota);
  (h) kegagalan simpan tidak lagi ditelan `.catch(() => {})` — muncul notifikasi alasan gagal;
  (i) signin: checkbox "Remember me" yang tidak berefek dihapus; alur reset password dibedakan
  antara **kirim link** dan **set password baru**.
  Verifikasi: `npx tsc --noEmit` bersih, `next build` sukses; `/` dan `/signin` balas 200,
  `/home` dan `/project` balas 307 (redirect ke signin) saat belum login.

- **2026-10-14** – Dokumen skripsi: dibuat `docs/LaporanTA-PebryAndrian-revisi3.docx` dari
  `revisi2.docx`. Perbaikan konsistensi Bab 1–4: (a) Tabel 3.1 disamakan jadi **6 tahap** sesuai
  Gambar 1.1 dan Subbab 1.5 (sebelumnya 7 tahap sehingga tidak cocok); (b) kunci sitasi
  `[NOR23]` → `[NOV23]` dan `[PRE21]` → `[PRA21]` (dua sitasi sebelumnya tidak punya entri di
  Daftar Pustaka); (c) Tabel 2.2 diberi kunci sitasi `[PRA23] [SAR22] [SAP23] [FAU24] [MAH24]
  [KUS22]` supaya seluruh 19 entri Daftar Pustaka dirujuk. Catatan terbuka: **F-02 Dashboard
  monitoring** (Tabel 4.2/4.4, UC-06, Tabel 4.8) belum ada di kode — `/home` masih grid
  "Scope Of Work" tanpa ringkasan tugas selesai/deadline terdekat. Perlu diputuskan: bangun
  fiturnya atau sesuaikan dokumen. `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-14** – `WorkspaceSelector`: tombol **`⋯`** yang tadinya mati (di header "Workspaces",
  `app/home/page.tsx`) kini berfungsi sebagai menu opsi workspace dan **dipindah ke dalam
  komponen selector** (di samping trigger) — karena hanya komponen itu yang tahu workspace mana
  yang sedang aktif. Efeknya fitur ini ikut jalan di `/profile` dan halaman project. Isi menu:
  **Rename** (modal, `renameWorkspace()`) dan **Delete** (modal konfirmasi, `deleteWorkspace()`).
  Catatan penting: `projects.workspace_id` ternyata **ON DELETE SET NULL** (bukan CASCADE),
  jadi menghapus workspace **tidak** menghapus project — project hanya lepas dari workspace.
  Teks konfirmasi dan assertion `scripts/db-check.mjs` disesuaikan dengan perilaku ini
  (rename lolos RLS `ws_write`, delete berhasil, project tetap ada dengan `workspace_id` NULL).
  `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-14** – `WorkspaceSelector`: tombol **`+`** di samping trigger workspace dihapus
  (redundan — "Add Workspace" sudah ada di dalam dropdown "Browse All"). Modal tambah
  workspace tetap ada dan tetap bisa dibuka dari item "Add Workspace" di dropdown.
  `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-14** – Home sidebar: bagian **History** (di bawah **Workspaces**) menampilkan project
  yang terakhir dibuka
  (ikon + nama project + badge scope, klik → `/project/<scope>/<card>`). Disimpan di
  `localStorage` (`invisual.recent-projects`) lewat `lib/utils.ts`:
  `recordRecentProject()` dipanggil saat `findProject()` sukses di halaman card,
  `listRecentProjects()` dibaca di sidebar — maksimal 8 entri, tanpa duplikat, terbaru di
  depan. Tanpa tabel/migrasi baru. `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-14** – Home: ikon **Bell** tidak lagi tombol mati. Klik → overlay `Notification`
  (`components/notification-panel.tsx`) bergaya gambar referensi — **panel besar terpusat**
  (padding `12px` dari tepi layar, `max-h-92vh`, sudut membulat) jadi hampir penuh tapi masih
  menyisakan tepi halaman asli seperti di gambar; tutup via tombol X atau Escape. Isinya:
  judul "Notification", tab
  **All Notification / I got a mention / Bookmarked**, sidebar **Sort by Board**, tombol
  "Show Unread notification", plus kartu berisi avatar + nama + waktu relatif, breadcrumb
  `scope › grup › task`, isi komentar, baris **Like / Reply**, dan input **Write a reply**.
  Sumber data nyata (bukan dummy): `lib/db.ts` → `listNotifications()` = `comments` + embed
  `profiles`/`tasks`/`task_groups`/`projects` (RLS `cm_all` sudah membatasi ke project user).
  Reply memakai `addComment(task_id, body, parent_id)`, Like memakai `likeComment()`.
  Bookmark + penanda "sudah dibaca" disimpan di `localStorage` (`invisual.notifications`),
  bukan tabel baru — jadi tanpa migrasi. **Di luar cakupan skripsi** (bonus).
  `scripts/db-check.mjs` ditambah assertion embed notifikasi. `tsc --noEmit` bersih,
  `next build` sukses.

- **2026-10-13** — Home / Scope Of Work: tombol **"New Card"** tidak lagi memakai `window.prompt`,
  tapi membuka modal **"Create New Card"** (gaya sama dengan modal "Create New Scope"): input nama
  (wajib) + deskripsi (opsional), tombol Create disabled kalau nama kosong. `createProject({ name,
  scope, description })` menyimpan ke Supabase, lalu daftar kartu di-refresh dari hasil query terbaru
  (`cardsFrom(title, rows)`, bukan dari state `projects` yang masih basi). Verifikasi browser
  (Edge/CDP): modal muncul dengan input + textarea, submit menutup modal & kartu tampil di grid,
  kartu tetap ada setelah reload. `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-12** — Konsistensi kolom: **Priority kini bisa diubah di semua tempat** (sebelumnya hanya di
  baris subtask, baris task menampilkan teks statis "Medium"). Ditambahkan komponen bersama
  `PriorityMenu` (flag + popover High/Medium/Low) yang dipakai di: baris task (kolom Priority),
  baris subtask, panel detail task, dan modal New Item. `TaskItem.priority` di-load dari
  `tasks.priority` (NOT NULL default `medium`, jadi tidak ada opsi "kosong"), handler `setTaskPriority`,
  dan kolom **Priority sekarang tampil default** di Main Table (`extraColumns` awal `['Priority']`) sesuai
  desain. Nilai palsu kolom "Timeline" (`2 Days`) dihapus → kolom tanpa data menampilkan `-`.
  Kegagalan simpan subtask tidak lagi senyap: muncul notifikasi merah (`notice`) berisi pesan error.
  Verifikasi browser (Edge/CDP): flag task medium→high bertahan setelah reload, flag subtask
  neutral→low, panel detail "PriorityHigh"→"PriorityMedium", modal New Item punya baris Priority.
  `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-12** — Main Table: baris subtask kini punya sel yang **bisa diubah** seperti baris task —
  Assignee (popover pilih member), Status (chip + popover dari `statusList`), Date (input date), dan
  Priority (flag High/Medium/Low). `lib/db.ts`: `SubTask` + `assignee_id`/`status_id`/`due_date`/
  `priority`, fungsi `updateSubtask()`, dan `loadBoard` pakai `select('*')` untuk subtasks supaya tetap
  jalan sebelum migrasi dijalankan. Handler: `updateSubtaskField()` (optimistic + simpan ke Supabase).
  Perlu migrasi manual (lihat §2). Verifikasi browser (Edge/CDP): menu assignee terbuka & member bisa
  dipilih, status → "In Progress", priority → flag `text-rose-500`, date → "Nov 20, 2026"; tanpa error
  runtime. `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-12** — Main Table: (a) ikon **`+` di samping judul grup** untuk menambah task (membuka modal
  New Item dengan grup itu sudah terpilih); (b) **indentasi baris subtask** diperjelas — nama subtask
  menjorok `(depth+1)*24px` (task 0, subtask 24, sub-subtask 48) sementara kolom checkbox tetap rata,
  agar task vs subtask mudah dibedakan. Verifikasi browser (Edge/CDP): paddingLeft nama = 0/24/48px,
  tombol `+` header grup membuka modal. `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-12** — Main Table: subtask ditampilkan sebagai **baris tabel bersarang** (seperti gambar
  referensi), bukan lagi daftar kecil di dalam sel. Migrasi DB `subtasks_parent_id`: kolom `parent_id`
  (self-reference, on delete cascade) + index. `lib/db.ts`: `SubTask.parent_id`, `addSubtask(...,
  parentId)`. `app/project/[scope]/[card]/page.tsx`: baris task menampilkan jumlah subtask + tombol "+",
  baris subtask punya chevron (buka sub-subtask), tombol "+" (tambah sub-subtask), dan tombol hapus;
  hapus subtask ikut menghapus turunannya. Ada baris **"Add Task"** di bawah tiap grup. Verifikasi:
  `scripts/db-check.mjs` meng-assert subtask bersarang; repro browser (Edge/CDP) — expand task →
  tampil baris NFR 01/NFR 02, expand NFR 01 → tampil 3 anak, tambah sub-subtask → tersimpan dengan
  `parent_id` yang benar. `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-12** — Ctrl+Z (undo) & Ctrl+Shift+Z / Ctrl+Y (redo) kini berfungsi di tab Doc. Sebelumnya
  tombol Undo/Redo sudah ada tetapi tidak ada shortcut keyboard, sehingga Ctrl+Z hanya memicu undo bawaan
  browser pada textarea (yang hilang saat re-render). Ditambahkan listener `keydown` di
  `app/project/[scope]/[card]/page.tsx` (aktif hanya saat tab Doc) yang memanggil `handleUndo`/`handleRedo`
  dan `preventDefault`. Verifikasi: repro browser (Edge/CDP) — mengetik " ABC" lalu Ctrl+Z mengembalikan
  ke "Hello", Ctrl+Shift+Z mengembalikan ke "Hello ABC", Ctrl+Z lagi ke "Hello".

- **2026-10-12** — Mengganti ukuran font (dropdown T/H1/H2/H3) kini mengubah **hanya teks yang di-blok**
  (diseleksi), bukan seluruh blok/dokumen. Di `app/project/[scope]/[card]/page.tsx`: saat mouse ditekan
  pada tombol "Format Text Style", posisi seleksi (`selectionStart/End`) + index blok yang sedang fokus
  diambil (`captureSelectionFromFocus`, `data-block-index`); jika ada teks terpilih, blok **dipecah**
  menjadi `[sebelum] + [teks terpilih] + [sesudah]` (tiap pecahan dapat id baru) dan hanya bagian
  terpilih yang berubah tipe/ukurannya. Jika tidak ada seleksi, hanya blok yang sedang fokus yang berubah
  (index-based). Verifikasi: repro browser (Edge/CDP) pada dokumen default "Studio" — memilih
  "Platform ini dirancang" lalu memilih Large Title menghasilkan `Platform ini dirancang` (30px, H1) +
  ` untuk membantu ...` (14px); tidak ada blok lain yang berubah, tanpa warning duplicate key.
  `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-12** — Perbaikan bug: mengganti ukuran/tipe font di satu blok ikut mengubah **semua** blok.
  Akar masalah (direproduksi): blok aktif dicocokkan lewat `b.id === activeBlock.id`; dokumen lama bisa
  punya beberapa blok dengan `id` kembar, sehingga guard lolos untuk semua blok. Perbaikan di
  `app/project/[scope]/[card]/page.tsx`: (1) blok aktif kini dilacak lewat **posisi/index**
  (`activeBlockIndex`), bukan id — jadi hanya blok yang diklik yang berubah walau id kembar;
  (2) saat dimuat dari Supabase, `id` blok dinormalisasi agar unik; (3) id blok baru anti-tabrakan.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses, dan repro browser (Edge/CDP) pada dokumen
  ber-id kembar menunjukkan hanya blok yang diklik yang berubah.

- **2026-10-12** — Tab **Doc** dibuat mengalir seperti aplikasi doc asli (bukan kotak per paragraf):
  blok tidak lagi bergaya kartu (ring/border/background per blok dihapus), jarak antar blok dirapatkan,
  dan tiap blok teks pakai **textarea auto-grow** (`DocTextarea`) sehingga tinggi mengikuti isi dan
  paragraf menyambung. Blok heading diberi jarak atas. Menambah blok (tombol "+ Add" / "Type something")
  langsung memfokuskan kursor ke blok baru. Slash command "/" tetap berfungsi.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses, rute balas 200.

- **2026-10-12** — Tab **Doc** disesuaikan dengan desain + fitur slash command. Tampilan: judul "Doc"
  lebih ringkas, baris meta (Creator/ Created/ Last updated) dengan ikon jam, kartu file lebih kecil
  (kotak biru + nama), dan ukuran gambar diperkecil. Fitur baru: mengetik **"/"** di blok teks membuka
  menu perintah (Normal text / Large title / Medium text / Small text / Quote) yang mengubah tipe blok
  dan menghapus "/" otomatis; bisa difilter dengan mengetik setelah "/", ditutup dengan Esc/klik luar.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses, rute balas 200.

- **2026-10-10** — Halaman project: **tab & komponen Kanban dihapus** (daftar tugas + statusnya sudah
  ditangani Main Table), dan di Main Table tiap baris tugas kini punya **tombol `+`** untuk menambah
  **subtask** langsung (daftar subtask tampil di panel expand tiap tugas, bisa dicentang/dihapus,
  tersimpan ke DB via `addSubtask`/`setSubtaskDone`/`deleteSubtask`).
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-10** — Halaman auth (`app/signin/page.tsx`): minimum password diturunkan dari 14 → **8 karakter**
  (label + validasi saat submit), dan pesan **429 email rate limit** dari Supabase kini diterjemahkan jadi
  keterangan yang jelas. Catatan: 429 berasal dari limit pengiriman email bawaan Supabase saat "Confirm email"
  aktif — solusi: matikan "Confirm email" di dashboard (development) atau pasang SMTP sendiri.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-10** — **Backend Supabase disambungkan (D3 selesai).** Skema 12 tabel + RLS + trigger
  dibuat lewat MCP Supabase. Klien: `lib/supabase/{client,server}.ts`, session refresh + proteksi
  rute di `proxy.ts`, callback email di `app/auth/confirm/route.ts`. Lapisan data `lib/db.ts`.
  Auth nyata di `app/signin/page.tsx` (signup/login/reset + Google OAuth). Logout di Home & Profile.
  Profile baca/tulis `profiles`. Workspace selector baca/tulis `workspaces`. Home menampilkan
  `projects` dari DB. Halaman project memuat board (statuses/groups/tasks/subtasks/comments/docs)
  dan menyimpan: drag & drop Kanban, buat/ubah/hapus tugas, grup, label status, subtask, komentar,
  assignee, tanggal, dan autosave tab Doc.
  Verifikasi: `npx tsc --noEmit` bersih, `next build` sukses, `node scripts/db-check.mjs` PASS.
  **Butuh tindakan manual:** matikan *Confirm email* (Authentication → Email) atau kirim email
  konfirmasi, supaya signup langsung dapat sesi.

- **2026-10-10** — Popup task detail: bagian **Attach file** dan **Comments** diubah sesuai desain.
  Attach file: header collapsible dengan chevron + jumlah file, area **drop or browse**
  (drag & drop atau klik), kartu file (ikon dokumen biru + nama + avatar uploader + hapus saat hover).
  Comments: tiap komentar jadi kartu (avatar, nama, waktu, isi) dengan footer **Like / Emoji / Reply**,
  balasan bertingkat, tombol like menambah hitungan. Panel komentar tetap di **kanan** (sesuai desain)
  dengan header + ikon **search yang berfungsi** (menyaring komentar berdasarkan nama/isi).
  Scrollbar pada kedua area popup (konten & komentar) disembunyikan lewat utilitas `no-scrollbar`.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-10** — Tombol **New Scope** di Home membuka modal **Create New Scope** (judul, input "scope
  name", tombol Create, close X) sesuai desain; scope baru masuk ke grid "Scope Of Work".
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-10** — Selector workspace disatukan lewat komponen bersama `components/workspace-selector.tsx`
  (dropdown + search + Recent workspace + modal Buat Workspace Baru). Kini dipakai di sidebar
  **Home** dan **Profile** juga, yang sebelumnya hanya kotak statis tanpa dropdown.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses, ketiga rute balas 200.

- **2026-10-09** — **Favorites** di sidebar kini berfungsi (halaman Home): proyek yang di-star di modal
  Scope Of Work muncul di bawah menu Favorites; klik untuk membuka proyeknya. Menu **Settings**
  dihapus dari sidebar Home & Profile. Verifikasi: `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-09** — Menu **Workspaces** diperbarui mengikuti desain Figma: panel dropdown dengan
  kotak **Search for a workspace**, daftar **Recent workspace** (yang aktif di-highlight biru),
  footer **+ Add Workspace** / **Browse All**. Klik Add Workspace (atau tombol `+`) membuka
  **modal** "Buat Workspace Baru" (bukan `prompt()` lagi). Verifikasi: `tsc --noEmit` bersih,
  `next build` sukses.

- **2026-10-09** — Halaman project dijadikan fungsional (tanpa backend):
  selector **workspace** (dropdown pilih) + **Add workspace**, tombol **Add View** menambah tab
  **Gantt** (timeline bar per tugas) & **Chart** (distribusi status), **invite email** kini
  menambah anggota ke daftar (state `members`), tombol download Doc menghasilkan file, dan
  toolbar **Calendar** (Search/Person/Filter/Sort) + mode **Month/Agenda** berfungsi.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-09** — Modal detail task dibuat **fungsional penuh**: judul editable, Status/Dates/Person
  benar-benar mengubah data, deskripsi tersimpan, **Subtasks** (tambah/centang/hapus + progress),
  **Attach file** (input file, daftar + hapus), **Comments** (kirim + daftar, Enter untuk kirim),
  tombol perkecil/perbesar. Model `TaskItem` ditambah field `subtasks/attachments/comments`.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-09** — Klik task kini membuka **modal detail task** (match desain Figma): breadcrumb Scope/Card,
  judul, baris Status (pill + dropdown), Dates, Person (ubah assignee), deskripsi editable,
  Add subtasks / Attach file, panel Comments + input komentar. Berlaku di Main Table (klik judul;
  dobel klik = rename) dan papan Kanban (klik kartu). File: `app/project/[scope]/[card]/page.tsx`.
  Verifikasi: `tsc --noEmit` bersih, `next build` sukses.

- **2026-10-09** — Tambah view **Kanban** (tab ke-4) dengan 4 kolom + drag & drop native,
  tombol tambah tugas per kolom. Status diselaraskan ke `To Do / In Progress / Review / Done`
  (sebelumnya label kustom "Working on it/Done/In Queue/Stuck" yang tidak ada di skripsi).
  File: `app/project/[scope]/[card]/page.tsx`. Verifikasi: `tsc --noEmit` bersih, `next build` sukses,
  board render tanpa error console.

---

## 6. Aturan menjaga konsistensi

1. Satu fitur = dicek ke tabel §1 & §3, lalu implement, lalu update status di file ini.
2. Setiap istilah di kode (nama menu, status, role) harus punya padanan istilah di skripsi.
3. Setiap selesai 1 pekerjaan: update baris terkait di §3 dan (kalau ada) catat di sini.
4. Screenshot hasil implementasi langsung ditandai untuk dipakai di Bab 5.
