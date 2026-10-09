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
docs         (id, project_id, blocks JSONB, updated_at)         -- isi tab "Doc"
```

> Catatan: skripsi menyebut kolom Kanban tetap (To Do/In Progress/Review/Done). Kode kini sudah
> memakai 4 status baku tersebut (`initialStatusList`). Fitur tambah label kustom tetap ada sebagai
> pelengkap, tapi baku default = 4 kolom skripsi.

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
