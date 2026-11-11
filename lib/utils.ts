import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
