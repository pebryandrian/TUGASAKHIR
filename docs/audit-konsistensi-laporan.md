# Audit Konsistensi Laporan TA ↔ Aplikasi

Dokumen ini memetakan setiap klaim di `docs/LaporanTA-PebryAndrian-revisi3.docx` ke kondisi
nyata kode dan database. Tujuannya: **tidak ada klaim di laporan yang tidak bisa dibuktikan
saat sidang.**

Tanggal audit: 13 November 2026
Metode: ekstraksi teks laporan + pembacaan kode `app/`, `lib/` + query langsung ke Supabase.

Legenda: ✅ sesuai · ⚠️ sebagian · ❌ belum ada

---

## 1. Ringkasan temuan

| # | Klaim di laporan | Lokasi laporan | Kondisi kode | Status |
|---|---|---|---|---|
| 1 | Dashboard: jumlah proyek, jumlah tugas, tugas selesai, deadline terdekat, aktivitas terbaru | Tabel 4.2 F-02, Tabel 4.4, Tabel 4.5 UC-06, §4.2.4, instrumen #8 | **Tidak ada sama sekali.** `/home` hanya grid Scope Of Work + tabel My Member | ❌ |
| 2 | Mengubah & menghapus proyek | Tabel 4.2 F-03, Tabel 4.4 | Hanya buat proyek; tidak ada UI ubah/hapus | ❌ |
| 3 | Membedakan hak akses Project Manager vs Member pada antarmuka | Tabel 4.2 F-13, Tabel 4.1, §1.4 | UI **tidak** membedakan; semua tombol tampil untuk semua peran | ❌ |
| 4 | Menetapkan peran anggota tim | Tabel 4.5 UC-03 | `addMemberByEmail()` selalu `role='member'`; tidak ada UI ubah peran | ❌ |
| 5 | Pengunggahan lampiran tugas | Tabel 4.2 F-12 | Hanya menyimpan **nama berkas**; tidak ada unggah ke Storage | ⚠️ |
| 6 | Proyek favorit tersimpan pada basis data (`project_members.favorite`) | Tabel 4.7 kamus data | Kolom `favorite` **ada di DB** tetapi kode memakai `localStorage` | ⚠️ |
| 7 | Subtask memiliki penanggung jawab, status, tenggat, prioritas | Tabel 4.2 F-06, §1.4 | ✅ ada di kode dan DB (kolom dimigrasikan 13 Nov 2026) | ✅ |
| 8 | Lampiran 1 SQL: tabel `subtasks` hanya 6 kolom | Lampiran 1 | DB nyata punya 10 kolom (4 kolom meta ditambahkan) | ❌ |
| 9 | Papan Kanban | tidak disebut sebagai fitur | Kode punya tab **Kanban** + drag & drop | ⚠️ |
| 10 | Autentikasi, profil, doc autosave, Gantt, Chart, Calendar, komentar bertingkat | F-01, F-09, F-10, F-11, F-14 | ✅ sesuai | ✅ |
| 11 | 12 tabel basis data | Tabel 4.6 | ✅ 12 tabel terverifikasi | ✅ |
| 12 | Trigger: profil otomatis, 4 status + 1 grup + 1 doc, owner jadi PM, `docs_touch` | §4.2.2 | ✅ terverifikasi lewat uji insert | ✅ |
| 13 | RLS: baca/ubah hanya proyek yang diikuti; hapus hanya PM | §4.2.2 | ⚠️ isolasi antar-proyek aman, tetapi **member masih bisa membuat/menghapus grup dan menambah label status** | ⚠️ |

---

## 2. Bukti teknis

### 2.1 Kolom nyata di database (diverifikasi 13 Nov 2026)

```
profiles          : id, name, email, role, avatar_url, created_at
workspaces        : id, name, owner_id, created_at
workspace_members : workspace_id, user_id
projects          : id, workspace_id, name, description, scope, progress,
                    start_date, due_date, owner_id, created_at
project_members   : project_id, user_id, role, favorite
task_groups       : id, project_id, title, color, position
statuses          : id, project_id, label, color_code, position
tasks             : id, project_id, group_id, status_id, title, description,
                    priority, due_date, assignee_id, position, checked, created_at
subtasks          : id, task_id, parent_id, text, done, position,
                    assignee_id, status_id, due_date, priority
attachments       : id, task_id, name, storage_path, owner_id, created_at
comments          : id, task_id, author_id, parent_id, body, likes, created_at
docs              : id, project_id, blocks, updated_at
```

### 2.2 Hasil uji RLS (dua akun nyata)

| Aksi member | Hasil |
|---|---|
| baca tugas pada proyek yang diikuti | ✅ 1 baris |
| baca proyek/tugas proyek lain | ✅ 0 baris (terisolasi) |
| ubah judul/status tugas **miliknya** | ✅ berhasil |
| ubah/hapus tugas orang lain | ✅ 0 baris (ditolak) |
| tambah subtask & komentar | ✅ berhasil |
| **buat grup baru** | ⚠️ berhasil (seharusnya PM) |
| **hapus grup** | ⚠️ berhasil (seharusnya PM) |
| **tambah label status** | ⚠️ berhasil (seharusnya PM) |
| hapus tugas | ✅ 0 baris |
| undang anggota | ✅ ditolak |
| ubah/hapus proyek | ✅ 0 baris |

---

## 3. Rekomendasi

### Prioritas 1 — bangun di kode (laporan tidak perlu diubah)

1. **Dashboard monitoring (F-02).** Muncul di 5 tempat laporan (Tabel 4.2, 4.4, 4.5 UC-06,
   §4.2.4, instrumen penelitian #8), jadi ini klaim yang paling sering dijanjikan.
   Isi: kartu jumlah proyek, jumlah tugas, tugas selesai, deadline terdekat, aktivitas terbaru.
2. **Ubah & hapus proyek (F-03).** Menu opsi pada kartu proyek.
3. **Hak akses PM/Member (F-13) + tutup 2 lubang RLS.** Gating tombol di UI + migrasi RLS
   agar buat/hapus grup dan tambah label hanya untuk PM.
4. **Favorit ke kolom `project_members.favorite`** agar sesuai kamus data Tabel 4.7.

### Prioritas 2 — perlu keputusan

5. **Peran anggota (UC-03).** Pilihan: (a) tambah dropdown peran di daftar anggota, atau
   (b) ubah kalimat UC-03 menjadi "mengundang anggota dengan peran Member".
6. **Unggah lampiran (F-12).** Pilihan: (a) implementasi Supabase Storage (butuh bucket +
   policy), atau (b) ubah kalimat menjadi "mencatat lampiran tugas".
7. **Kanban.** Pilihan: (a) tambahkan ke Tabel 4.2/4.4/4.8 sebagai F-15, atau
   (b) sembunyikan tab Kanban dari aplikasi.

### Prioritas 3 — perbarui laporan saja

8. **Lampiran 1**: tambahkan 4 kolom meta pada definisi tabel `subtasks`.
9. **Tabel 4.8**: sebutkan Kanban bila dipilih opsi 7(a); perjelas bahwa Gantt/Chart adalah
   tampilan tambahan yang dibuka lewat tombol `+`, bukan tab tetap.

---

## 4. Catatan

- Bab 5 (Implementasi dan Evaluasi) dan Bab 6 (Kesimpulan dan Saran) sudah disebut pada
  Sistematika Penulisan, tetapi belum ada isinya di `revisi3.docx`. Saat menulis Bab 5,
  gunakan tabel di dokumen ini sebagai daftar bukti agar konsisten.
- Setiap kali fitur di kode berubah, perbarui `SPEC.md` §3 dan dokumen ini bersamaan.
