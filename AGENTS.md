<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Alur Git (wajib diikuti)

- **Satu perubahan = satu commit.** Jangan menggabungkan beberapa perbaikan yang tidak berkaitan
  dalam satu commit.
- **Push setiap commit satu per satu**, bukan menumpuk beberapa commit lalu push sekaligus.
  Urutannya: `git add` → `git commit` → `git push` untuk commit itu, baru lanjut ke perubahan
  berikutnya.
- Setelah push, **buat pull request `development` → `main` secara otomatis** (jangan hanya
  menyerahkan tautan compare ke pengguna):

  ```powershell
  node scripts/open-pr.mjs
  ```

  Skrip ini memakai GitHub REST API dengan token dari Git Credential Manager (tidak butuh `gh`
  CLI), menampilkan PR yang sudah terbuka, dan hanya membuat PR baru bila belum ada. Bila PR sudah
  ada dan isinya perlu disegarkan setelah menambah commit, jalankan
  `node scripts/open-pr.mjs --update`. Selalu laporkan nomor dan tautan PR di jawaban akhir.
- Jangan pernah mencetak token GitHub ke output, ke berkas, atau ke dalam commit.
- Jangan commit skrip uji sementara (`scripts/_tmp-*.mjs`) maupun hasil build (`.next/`).
- Jangan mengubah berkas laporan (`*.docx`, `*.pdf`) di folder induk.

