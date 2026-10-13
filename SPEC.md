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
> date/priority pada baris subtask bisa disimpan. Sebelum ini dijalankan, kolomnya kosong & edit
> subtask tidak tersimpan (UI tetap jalan, tidak error).
>
> ```sql
> alter table public.subtasks
>   add column if not exists assignee_id uuid,
>   add column if not exists status_id   uuid,
>   add column if not exists due_date    date,
>   add column if not exists priority    text;
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
| F1 Autentikasi | Supabase Auth, proteksi rute | `signup`/`login`/`reset` via Supabase Auth, logout, `proxy.ts` menjaga `/home`, `/project`, `/profile` | ✅ Nyata |
| F2 Dashboard | Statistik proyek/tugas/deadline | Halaman `/home`: daftar scope + card dari tabel `projects` (fallback data contoh bila DB kosong) | ⚠️ Sebagian (belum ada ringkasan tugas/deadline) |
| F3 Kanban + drag&drop | Papan 4 kolom, drag-drop | View **Kanban** 4 kolom To Do/In Progress/Review/Done + drag & drop; perpindahan tersimpan ke `tasks.status_id` | ✅ Nyata |
| F4 Task management | CRUD tugas lengkap | Create/rename/deskripsi/prioritas/tanggal/assignee + subtask + komentar tersimpan di Supabase | ✅ Nyata (lampiran masih lokal) |
| F5 Project management | Kelola proyek + timeline | Project & workspace tersimpan di Supabase; Main Table/Calendar/Doc/Gantt/Chart; isi tab Doc autosave ke `docs` | ✅ Nyata |
| F6 Member management | Daftar + penugasan + peran | Anggota dari `project_members`+`profiles`, assignee tersimpan ke `tasks.assignee_id`, invite by email | ✅ Nyata |
| F7 Peran PM/Member | Beda hak akses | `profiles.role` + `project_members.role`; RLS: PM boleh ubah/menghapus, Member hanya tugasnya | ✅ Nyata (UI belum menyembunyikan tombol PM) |
| — Backend | Supabase/PostgreSQL | 12 tabel + RLS + trigger; klien `@supabase/ssr`; lapisan data `lib/db.ts` | ✅ Nyata |
| — Doc editor | (tidak diminta khusus) | Ada editor kaya (bold, list, image, file, undo/redo), isi tersimpan sebagai JSONB | ✅ ekstra, di luar skripsi |

**Bonus di luar skripsi (jangan diangkat sebagai fitur inti kecuali diminta):** editor Doc, color picker label ala Monday, export CSV, sort/filter lanjutan.

---

## 4. Status dokumen skripsi (`LaporanTA-PebryAndrian-revisi.docx`)

| Bagian | Kondisi | Perlu |
|--------|---------|-------|
| Bab 1 Pendahuluan | ✅ lengkap | — |
| Bab 2 Landasan Teori | ✅ lengkap (+ Tabel 2.1 penelitian terdahulu) | — |
| Bab 3 Skema Penelitian | ✅ lengkap | — |
| Bab 4 Analisis & Perancangan | ⚠️ baru bagian analisis | **Perancangan**: arsitektur, ERD, Use Case, Activity, Sequence, UI |
| Bab 5 Implementasi & Evaluasi | ❌ kosong | Hasil implementasi, screenshot, Black Box, evaluasi |
| Bab 6 Kesimpulan & Saran | ❌ kosong | Isi kesimpulan + saran |
| Daftar Pustaka | ❌ kosong | Sitasi (kode sitasi sudah ada, mis. [PRE20], [NUG26] belum ada entri) |
| Lampiran | ❌ kosong | Kuesioner, hasil uji |

**Inkonsistensi teks yang harus dibetulkan:**
- Judul Bab 4 di Daftar Isi beda dengan Sistematika Penulisan (FRONT).
- Daftar Tabel: "Tabel 4.1 Skala Likert" dan "Tabel 4.2 IdentifikasiFitur" tidak cocok dengan isi Bab 4 (4.1 = Analisis Kebutuhan Sistem, 4.2 = Identifikasi Fitur).
- Judul skripsi: teks isi menulis "(STUDI KASUS : INVISUAL STUDIO)"; nama perusahaan di bab lain "Invisual Studio" (tanpa "Studio" ganda). Samakan.
- Typo: "PenelitianTerdahulu", "TujuanTugas Akhir", "Passowrd", spasi ganda, tanda titik dobel.

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
