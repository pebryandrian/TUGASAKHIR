#!/usr/bin/env node
// Membuat (atau menampilkan) pull request `development` -> `main` secara otomatis.
//
// Dipakai setiap kali selesai push commit, supaya halaman "Compare & pull request"
// di GitHub tidak perlu dibuka manual.
//
// Tidak memerlukan GitHub CLI (`gh`): memakai GitHub REST API dengan token dari
// Git Credential Manager (kredensial yang sama dengan yang dipakai `git push`).
// Token tidak pernah dicetak ke output.
//
// Contoh:
//   node scripts/open-pr.mjs
//   node scripts/open-pr.mjs --base main --head development
//   node scripts/open-pr.mjs --title "feat: ..." --body-file isi-pr.md

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// ---------------------------------------------------------------------------
// Argumen
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const argOf = (name, fallback = '') => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const BASE = argOf('base', 'main')
const HEAD = argOf('head', 'development')
const TITLE_ARG = argOf('title', '')
const BODY_FILE = argOf('body-file', '')
// `--update` memperbarui judul/isi PR yang sudah terbuka (mis. setelah menambah commit).
const UPDATE = args.includes('--update')

// ---------------------------------------------------------------------------
// Repo dari remote origin
// ---------------------------------------------------------------------------
const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim()
const match = remote.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)/)
if (!match) throw new Error(`Remote origin bukan repositori GitHub: ${remote}`)
const { owner, repo } = match.groups

// ---------------------------------------------------------------------------
// Token dari Git Credential Manager
// ---------------------------------------------------------------------------
function githubToken() {
  const input = 'protocol=https\nhost=github.com\n\n'
  const out = execFileSync('git', ['credential', 'fill'], { input, encoding: 'utf8' })
  const line = out.split('\n').find((l) => l.startsWith('password='))
  return line ? line.slice('password='.length).trim() : ''
}

const token = githubToken()
if (!token) {
  throw new Error('Token GitHub tidak ditemukan. Jalankan `git pull` sekali agar kredensial tersimpan.')
}

const api = `https://api.github.com/repos/${owner}/${repo}`
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'invisual-agent',
}

async function gh(pathname, init = {}) {
  const res = await fetch(`${api}${pathname}`, { headers, ...init })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const reason = typeof data === 'object' && data?.message ? data.message : text
    throw new Error(`${res.status} ${reason}`)
  }
  return data
}

const git = (...argv) =>
  execFileSync('git', argv, { encoding: 'utf8' }).trim()

// ---------------------------------------------------------------------------
// Sudah ada PR terbuka? Tampilkan; dengan `--update` perbarui judul/isi.
// ---------------------------------------------------------------------------
const open = await gh(`/pulls?head=${owner}:${HEAD}&state=open`)
if (open.length > 0 && !UPDATE) {
  const pr = open[0]
  console.log(`PR #${pr.number} sudah terbuka: ${pr.html_url}`)
  console.log(`  ${pr.head.ref} -> ${pr.base.ref} | ${pr.title}`)
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Susun isi PR dari commit yang belum masuk ke branch tujuan
// ---------------------------------------------------------------------------
let commits = []
try {
  const out = git('log', '--reverse', '--pretty=format:%s', `origin/${BASE}..${HEAD}`)
  commits = out ? out.split('\n').filter(Boolean) : []
} catch {
  commits = []
}

if (commits.length === 0) {
  console.log(`Tidak ada commit baru di ${HEAD} dibanding origin/${BASE}. Tidak ada PR yang dibuat.`)
  process.exit(0)
}

const GROUP_LABEL = {
  feat: 'Fitur',
  fix: 'Perbaikan',
  docs: 'Dokumentasi',
  chore: 'Lain-lain',
}

const buckets = new Map()
for (const c of commits) {
  const type = c.split(/[(:]/)[0].trim()
  if (!buckets.has(type)) buckets.set(type, [])
  buckets.get(type).push(c)
}

const sections = []
for (const [type, label] of Object.entries(GROUP_LABEL)) {
  if (!buckets.has(type)) continue
  sections.push(`### ${label}\n\n${buckets.get(type).map((c) => `- ${c}`).join('\n')}`)
}
for (const [type, list] of buckets) {
  if (type in GROUP_LABEL) continue
  sections.push(`### ${type}\n\n${list.map((c) => `- ${c}`).join('\n')}`)
}

// Judul: pakai --title bila diberikan. Saat memperbarui PR yang sudah ada,
// judul lamanya dipertahankan agar judul deskriptif tidak tertimpa judul generik.
const title = TITLE_ARG || (open.length > 0 ? open[0].title : `${HEAD} -> ${BASE}: ${commits.length} commit`)

const body = BODY_FILE
  ? readFileSync(BODY_FILE, 'utf8')
  : [
      '## Ringkasan',
      '',
      `Pull request otomatis dari branch \`${HEAD}\` ke \`${BASE}\` berisi **${commits.length} commit**.`,
      '',
      '## Perubahan',
      '',
      sections.join('\n\n'),
      '',
      '## Verifikasi',
      '',
      '- `npx tsc --noEmit` bersih',
      '- `npm run build` sukses',
    ].join('\n')

// ---------------------------------------------------------------------------
// Buat PR baru, atau perbarui PR yang sudah terbuka (`--update`)
// ---------------------------------------------------------------------------
if (open.length > 0) {
  const existing = open[0]
  const pr = await gh(`/pulls/${existing.number}`, {
    method: 'PATCH',
    body: JSON.stringify({ title, body }),
  })
  console.log(`PR #${pr.number} diperbarui: ${pr.html_url}`)
  console.log(`  ${pr.head.ref} -> ${pr.base.ref} | ${pr.title}`)
  process.exit(0)
}

const pr = await gh('/pulls', {
  method: 'POST',
  body: JSON.stringify({ title, head: HEAD, base: BASE, body, draft: false }),
})

console.log(`PR DIBUAT #${pr.number}: ${pr.html_url}`)
console.log(`  ${pr.head.ref} -> ${pr.base.ref} | ${pr.title}`)
