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

