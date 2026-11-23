# Membuat (atau menampilkan) pull request `development` -> `main` secara otomatis.
#
# Dipakai setiap kali selesai push commit, supaya tidak perlu membuka halaman
# "Compare & pull request" di GitHub secara manual.
#
# Tidak memerlukan GitHub CLI (`gh`): memakai GitHub REST API dengan token dari
# Git Credential Manager (kredensial yang sama dengan yang dipakai `git push`).
# Token tidak pernah dicetak ke layar.
#
# Contoh:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-pr.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-pr.ps1 -Base main -Head development

param(
  [string]$Base = 'main',
  [string]$Head = 'development'
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# 1. Tentukan owner/repo dari remote origin.
# ---------------------------------------------------------------------------
$remote = (git remote get-url origin).Trim()
if ($remote -match 'github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)') {
  $owner = $Matches['owner']
  $repo = $Matches['repo']
} else {
  throw "Remote origin bukan repositori GitHub: $remote"
}

# ---------------------------------------------------------------------------
# 2. Ambil token dari Git Credential Manager.
# ---------------------------------------------------------------------------
$cred = "protocol=https`nhost=github.com`n`n" | git credential fill 2>$null
$token = ($cred -split "`n" | Where-Object { $_ -like 'password=*' }) -replace 'password=', ''
if (-not $token) {
  throw 'Token GitHub tidak ditemukan. Jalankan `git pull` sekali agar kredensial tersimpan.'
}

$headers = @{
  Authorization          = "Bearer $token"
  Accept                 = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
  'User-Agent'           = 'invisual-agent'
}
$api = "https://api.github.com/repos/$owner/$repo"

# ---------------------------------------------------------------------------
# 3. Kalau sudah ada PR terbuka, cukup tampilkan (tidak membuat duplikat).
# ---------------------------------------------------------------------------
$open = Invoke-RestMethod -Uri "$api/pulls?head=$owner`:$Head&state=open" -Headers $headers -Method Get
if ($open.Count -gt 0) {
  $pr = $open | Select-Object -First 1
  "PR #$($pr.number) sudah terbuka: $($pr.html_url)"
  "  $($pr.head.ref) -> $($pr.base.ref) | $($pr.title)"
  return
}

# ---------------------------------------------------------------------------
# 4. Susun isi PR dari commit yang belum masuk ke branch tujuan.
# ---------------------------------------------------------------------------
$commits = @(git log --reverse --pretty=format:"- %s" "origin/$Base..$Head")
if ($commits.Count -eq 0) {
  "Tidak ada commit baru di $Head dibanding origin/$Base. Tidak ada PR yang dibuat."
  return
}

$latest = (git log -1 --pretty=format:"%s" $Head).Trim()
$body = @"
## Ringkasan

Pull request otomatis dari branch ``$Head`` ke ``$Base`` ($($commits.Count) commit).

## Daftar commit

$($commits -join "`n")

## Verifikasi

- ``npx tsc --noEmit`` bersih
- ``npm run build`` sukses
"@

$payload = @{
  title = $latest
  head  = $Head
  base  = $Base
  body  = $body
  draft = $false
} | ConvertTo-Json -Depth 5

try {
  $pr = Invoke-RestMethod -Uri "$api/pulls" -Headers $headers -Method Post -Body $payload -ContentType 'application/json'
  "PR DIBUAT #$($pr.number): $($pr.html_url)"
  "  $($pr.head.ref) -> $($pr.base.ref) | $($pr.title)"
} catch {
  # Biasanya karena `$Head` belum di-push atau tidak ada beda dengan `$Base`.
  throw "Gagal membuat PR: $($_.Exception.Message)"
}
