import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Slug dipakai di URL (/project/<scope>/<card>). Nilai tersimpan di database
// ("Studio Client", "Aqua") harus dibandingkan lewat slug agar cocok dengan URL.
export function slugify(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export interface RecentProject {
  scope: string // slug, dipakai di URL
  card: string // slug, dipakai di URL
  name: string
  scopeTitle: string
}

const RECENT_KEY = 'invisual.recent-projects'

export function listRecentProjects(): RecentProject[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

// Dipanggil saat halaman project dibuka. Terbaru di depan, tanpa duplikat.
export function recordRecentProject(entry: RecentProject): void {
  const rest = listRecentProjects().filter(
    (r) => r.scope !== entry.scope || r.card !== entry.card,
  )
  localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...rest].slice(0, 8)))
}

// ======================== FAVORITES ========================
// Favorit disimpan per project id supaya tetap stabil walau nama project diubah.

export interface FavoriteProject {
  id: string
  name: string
  scope: string
}

const FAVORITES_KEY = 'invisual.favorites'

export function listFavorites(): FavoriteProject[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toggleFavorite(entry: FavoriteProject): FavoriteProject[] {
  const current = listFavorites()
  const exists = current.some((f) => f.id === entry.id)
  const next = exists ? current.filter((f) => f.id !== entry.id) : [...current, entry]
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  return next
}

