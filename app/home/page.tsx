'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Users,
  Search,
  Home,
  ChevronDown,
  History,
  Clock,
  Settings,
  Plus,
  X,
  Star,
  LogOut,
  Loader2,
  AlertCircle,
  ArrowUpDown,
  Check,
  Sparkles,
  Folder,
  ListTodo,
  CheckCircle2,
  CalendarDays,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { WorkspaceSelector } from '@/components/workspace-selector'
import { NotificationPanel } from '@/components/notification-panel'
import {
  listRecentProjects,
  slugify,
  type RecentProject,
} from '@/lib/utils'
import { signOut } from '@/lib/auth'
import {
  createProject,
  deleteProject,
  getDashboardStats,
  getSessionProfile,
  listFavoriteProjects,
  listProjectTaskStats,
  listProjects,
  listProfiles,
  listRecentActivity,
  listUpcomingDeadlines,
  setProjectFavorite,
  updateProject,
  type ActivityItem,
  type DashboardStats,
  type DeadlineItem,
  type Profile,
  type Project,
} from '@/lib/db'
import { seedDemoProjects } from '@/lib/template'

interface ScopeItem {
  id: string
  title: string
  image: string
}

interface ProjectCard {
  id: string
  name: string
  description: string
  done: number
  total: number
}

type MemberSort = 'name-asc' | 'name-desc' | 'email-asc'

const MEMBER_SORT_LABEL: Record<MemberSort, string> = {
  'name-asc': 'Name (A to Z)',
  'name-desc': 'Name (Z to A)',
  'email-asc': 'Email (A to Z)',
}

// Gambar hanya dekorasi kartu scope; tidak ada hubungannya dengan data project.
const SCOPE_IMAGES = [
  '/images/scope/scope-client.jpg',
  '/images/scope/scope-marketplace.jpg',
  '/images/scope/scope-mockup.jpg',
  '/images/scope/scope-studio.jpg',
  '/images/scope/scope-font.jpg',
]

function Avatar({ name, src, size = 32 }: { name: string; src: string | null; size?: number }) {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0 border border-neutral-700"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center text-xs font-semibold text-neutral-200 shrink-0"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const memberSearchRef = useRef<HTMLInputElement>(null)
  const membersSectionRef = useRef<HTMLElement>(null)

  const [searchMember, setSearchMember] = useState('')
  const [memberSort, setMemberSort] = useState<MemberSort>('name-asc')
  const [showMemberSort, setShowMemberSort] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [today, setToday] = useState('')

  // Data dari Supabase
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [taskStats, setTaskStats] = useState<Record<string, { total: number; done: number }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [selectedScope, setSelectedScope] = useState<ScopeItem | null>(null)
  const [modalSearch, setModalSearch] = useState('')
  const [favorites, setFavorites] = useState<{ id: string; name: string; scope: string | null }[]>([])
  const [showFavorites, setShowFavorites] = useState(true)

  // Dashboard monitoring (F-02)
  const [stats, setStats] = useState<DashboardStats>({
    projectCount: 0,
    taskCount: 0,
    doneCount: 0,
    memberCount: 0,
  })
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])

  // Ubah / hapus project (F-03)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [projectActionBusy, setProjectActionBusy] = useState(false)
  const [projectActionError, setProjectActionError] = useState('')

  const [showNewScopeModal, setShowNewScopeModal] = useState(false)
  const [newScopeName, setNewScopeName] = useState('')
  const [showNewCardModal, setShowNewCardModal] = useState(false)
  const [newCardName, setNewCardName] = useState('')
  const [newCardDesc, setNewCardDesc] = useState('')
  // Project baru langsung diisi contoh tugas supaya board tidak kosong.
  const [newCardWithTemplate, setNewCardWithTemplate] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [demoNotice, setDemoNotice] = useState('')

  const refreshProjects = useCallback(async () => {
    setError('')
    try {
      const [rows, people, taskStats, dashboard, upcoming, recent, favs] = await Promise.all([
        listProjects(),
        listProfiles().catch(() => [] as Profile[]),
        listProjectTaskStats().catch(() => ({})),
        getDashboardStats().catch(() => ({
          projectCount: 0,
          taskCount: 0,
          doneCount: 0,
          memberCount: 0,
        })),
        listUpcomingDeadlines(5).catch(() => [] as DeadlineItem[]),
        listRecentActivity(6).catch(() => [] as ActivityItem[]),
        listFavoriteProjects().catch(() => []),
      ])
      setProjects(rows)
      setProfiles(people)
      setTaskStats(taskStats)
      setStats(dashboard)
      setDeadlines(upcoming)
      setActivity(recent)
      setFavorites(favs)
      return rows
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat project.')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  useEffect(() => {
    setRecentProjects(listRecentProjects())
    setToday(
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    )
    getSessionProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
  }, [])

  // Scope diturunkan dari project nyata. Tidak ada scope contoh.
  const scopes: ScopeItem[] = useMemo(() => {
    const titles = Array.from(
      new Set(projects.map((p) => p.scope).filter((s): s is string => Boolean(s))),
    )
    return titles.map((title, i) => ({
      id: `scope-${title}`,
      title,
      image: SCOPE_IMAGES[i % SCOPE_IMAGES.length],
    }))
  }, [projects])

  const cardsFrom = useCallback(
    (title: string): ProjectCard[] =>
      projects
        .filter((p) => p.scope === title)
        .map((p) => {
          const stat = taskStats[p.id] ?? { total: 0, done: 0 }
          return {
            id: p.id,
            name: p.name,
            description: p.description ?? '',
            done: stat.done,
            total: stat.total,
          }
        }),
    [projects, taskStats],
  )

  const openScopeModal = (item: ScopeItem) => {
    setSelectedScope(item)
    setModalSearch('')
  }

  // Muat beberapa project contoh lengkap dengan grup, tugas, subtask, komentar,
  // dan isi tab Doc. Project yang sudah ada dilewati.
  const handleSeedDemo = async () => {
    if (seedingDemo) return
    setSeedingDemo(true)
    setDemoNotice('')
    setError('')
    try {
      const { created, skipped } = await seedDemoProjects()
      await refreshProjects()
      setDemoNotice(
        created > 0
          ? `${created} project contoh ditambahkan${skipped ? `, ${skipped} dilewati karena sudah ada` : ''}.`
          : 'Semua project contoh sudah ada, tidak ada yang ditambahkan.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat contoh project.')
    } finally {
      setSeedingDemo(false)
    }
  }

  const handleCreateScope = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newScopeName.trim()
    if (!title || creating) return
    if (scopes.some((s) => s.title.toLowerCase() === title.toLowerCase())) {
      setCreateError('Scope dengan nama itu sudah ada.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      await createProject({ name: title, scope: title })
      await refreshProjects()
      setNewScopeName('')
      setShowNewScopeModal(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Gagal membuat scope.')
    } finally {
      setCreating(false)
    }
  }

  const openNewCardModal = () => {
    setNewCardName('')
    setNewCardDesc('')
    setNewCardWithTemplate(true)
    setCreateError('')
    setShowNewCardModal(true)
  }

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedScope || creating) return
    const name = newCardName.trim()
    if (!name) return
    if (cardsFrom(selectedScope.title).some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setCreateError('Card dengan nama itu sudah ada di scope ini.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      await createProject(
        {
          name,
          scope: selectedScope.title,
          description: newCardDesc.trim() || undefined,
        },
        { template: newCardWithTemplate },
      )
      await refreshProjects()
      setShowNewCardModal(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Gagal membuat card.')
    } finally {
      setCreating(false)
    }
  }

  const closeScopeModal = () => {
    setSelectedScope(null)
    setModalSearch('')
    setShowNewCardModal(false)
    setCreateError('')
  }

  const handleToggleFavorite = async (card: ProjectCard, scopeTitle: string) => {
    const isFavorite = favorites.some((f) => f.id === card.id)
    // Optimistis: ubah tampilan dulu, lalu simpan ke kolom project_members.favorite.
    setFavorites((prev) =>
      isFavorite
        ? prev.filter((f) => f.id !== card.id)
        : [...prev, { id: card.id, name: card.name, scope: scopeTitle }],
    )
    try {
      await setProjectFavorite(card.id, !isFavorite)
    } catch (err) {
      // Kembalikan bila gagal agar tampilan tidak berbohong.
      setFavorites((prev) =>
        isFavorite
          ? [...prev, { id: card.id, name: card.name, scope: scopeTitle }]
          : prev.filter((f) => f.id !== card.id),
      )
      setError(err instanceof Error ? err.message : 'Gagal menyimpan favorit.')
    }
  }

  // ======================== UBAH & HAPUS PROJECT (F-03) ========================

  const openEditProject = (card: ProjectCard) => {
    const project = projects.find((p) => p.id === card.id)
    if (!project) return
    setEditingProject(project)
    setEditName(project.name)
    setEditDesc(project.description ?? '')
    setProjectActionError('')
  }

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || projectActionBusy) return
    const name = editName.trim()
    if (!name) return
    setProjectActionBusy(true)
    setProjectActionError('')
    try {
      await updateProject(editingProject.id, {
        name,
        description: editDesc.trim() || null,
      })
      await refreshProjects()
      setEditingProject(null)
    } catch (err) {
      setProjectActionError(err instanceof Error ? err.message : 'Gagal menyimpan project.')
    } finally {
      setProjectActionBusy(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!deletingProject || projectActionBusy) return
    setProjectActionBusy(true)
    setProjectActionError('')
    try {
      await deleteProject(deletingProject.id)
      await refreshProjects()
      setDeletingProject(null)
      if (selectedScope) {
        // Scope yang tersisa mungkin sudah kosong.
        const remaining = (await listProjects()).filter((p) => p.scope === selectedScope.title)
        if (remaining.length === 0) setSelectedScope(null)
      }
    } catch (err) {
      setProjectActionError(err instanceof Error ? err.message : 'Gagal menghapus project.')
    } finally {
      setProjectActionBusy(false)
    }
  }

  const modalCards = selectedScope ? cardsFrom(selectedScope.title) : []

  const filteredModalCards = modalCards.filter(
    (c) =>
      c.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(modalSearch.toLowerCase()),
  )

  const filteredMembers = useMemo(() => {
    const term = searchMember.trim().toLowerCase()
    const rows = profiles.filter(
      (m) =>
        m.name.toLowerCase().includes(term) || (m.email ?? '').toLowerCase().includes(term),
    )
    return [...rows].sort((a, b) => {
      if (memberSort === 'name-desc') return b.name.localeCompare(a.name)
      if (memberSort === 'email-asc') return (a.email ?? '').localeCompare(b.email ?? '')
      return a.name.localeCompare(b.name)
    })
  }, [profiles, searchMember, memberSort])

  const displayName = profile?.name || 'there'
  const firstName = displayName.split(' ')[0]

  return (
    <div className="min-h-screen w-full bg-[#141517] text-white flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="w-full h-16 bg-[#111214] border-b border-neutral-800/80 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src="/images/logo/logo.png"
              alt="INVISUAL Logo"
              width={28}
              height={28}
              priority
              className="w-7 h-7 object-contain"
            />
            <span className="font-bold text-neutral-400 tracking-wider text-sm hover:text-white transition">
              INVISUAL
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-neutral-400">
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => membersSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
            aria-label="Team group"
          >
            <Users size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => memberSearchRef.current?.focus()}
            className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
            aria-label="Search member"
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
          {/* User Profile Avatar & Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-8 h-8 rounded-full border border-neutral-600 hover:border-blue-400 overflow-hidden bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-200 transition cursor-pointer ml-1"
              aria-label="User menu"
            >
              <Avatar name={displayName} src={profile?.avatar_url ?? null} />
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-52 bg-[#1b1c20] border border-neutral-800/90 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex flex-col items-center text-center p-2 pb-3 border-b border-neutral-800/80">
                    <div className="w-12 h-12 rounded-full border border-neutral-600 overflow-hidden bg-neutral-800 flex items-center justify-center mb-2">
                      <Avatar name={displayName} src={profile?.avatar_url ?? null} size={48} />
                    </div>
                    <p className="text-sm font-semibold text-white tracking-tight">{displayName}</p>
                    {profile?.email && (
                      <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-[180px]">
                        {profile.email}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        router.push('/profile')
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition cursor-pointer text-left"
                    >
                      <Settings size={15} />
                      <span>Profile Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut()
                        router.push('/signin')
                        router.refresh()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition cursor-pointer text-left"
                    >
                      <LogOut size={15} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-64 bg-[#111214] border-r border-neutral-800/80 p-4 lg:min-h-[calc(100vh-4rem)] flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer bg-blue-600 text-white shadow-sm"
              >
                <Home size={18} strokeWidth={1.8} />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFavorites((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-800/40"
              >
                <span>Favorites</span>
                <ChevronDown
                  size={15}
                  strokeWidth={1.8}
                  className={`transition-transform ${showFavorites ? '' : '-rotate-90'}`}
                />
              </button>

              {showFavorites && (
                <div className="pl-3 space-y-0.5">
                  {favorites.length === 0 ? (
                    <p className="px-4 py-1.5 text-xs text-neutral-600">
                      Belum ada favorit. Klik bintang pada proyek.
                    </p>
                  ) : (
                    favorites.map((f) => (
                      <Link
                        key={f.id}
                        href={`/project/${slugify(f.scope)}/${slugify(f.name)}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-neutral-800/40 transition"
                      >
                        <Star size={13} fill="currentColor" className="text-yellow-400 shrink-0" />
                        <span className="truncate">{f.name}</span>
                        <span className="ml-auto text-[10px] text-neutral-500 shrink-0">
                          {f.scope ?? ''}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </nav>

            <div className="pt-2">
              <div className="flex items-center justify-between text-neutral-400 px-2 mb-3">
                <span className="text-sm font-medium text-neutral-300">Workspaces</span>
              </div>

              <WorkspaceSelector />
            </div>

            {/* History: project yang terakhir dibuka (localStorage). */}
            <div className="pt-2">
              <div className="flex items-center gap-2 px-2 mb-3 text-neutral-400">
                <History size={15} strokeWidth={1.8} />
                <span className="text-sm font-medium text-neutral-300">History</span>
              </div>
              <div className="pl-3 space-y-0.5">
                {recentProjects.length === 0 ? (
                  <p className="px-4 py-1.5 text-xs text-neutral-600">
                    Belum ada project yang dibuka.
                  </p>
                ) : (
                  recentProjects.map((r) => (
                    <Link
                      key={`${r.scope}/${r.card}`}
                      href={`/project/${slugify(r.scope)}/${slugify(r.card)}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-neutral-800/40 transition"
                    >
                      <Clock size={13} className="text-neutral-500 shrink-0" />
                      <span className="truncate">{r.name}</span>
                      <span className="ml-auto text-[10px] text-neutral-500 shrink-0">
                        {r.scopeTitle}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 xl:p-12 overflow-y-auto">
          <div className="mb-8">
            <p className="text-xs sm:text-sm text-neutral-400 font-normal">{today || '\u00a0'}</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1">
              Hello, {firstName}
            </h1>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ================= DASHBOARD MONITORING (F-02) ================= */}
          <section className="mb-10" aria-label="Dashboard monitoring">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Proyek', value: stats.projectCount, icon: Folder },
                { label: 'Total Tugas', value: stats.taskCount, icon: ListTodo },
                { label: 'Tugas Selesai', value: stats.doneCount, icon: CheckCircle2 },
                { label: 'Anggota Tim', value: stats.memberCount, icon: Users },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-neutral-800/80 bg-[#191a1e] px-4 py-4 flex items-center gap-3"
                >
                  <span className="w-9 h-9 rounded-lg bg-blue-600/15 text-blue-400 flex items-center justify-center shrink-0">
                    <item.icon size={17} strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-white leading-none tabular-nums">
                      {item.value}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1 truncate">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Deadline terdekat */}
              <div className="rounded-xl border border-neutral-800/80 bg-[#191a1e] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={15} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Deadline Terdekat</h3>
                </div>
                {deadlines.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-3">
                    Tidak ada tugas dengan tenggat mendatang.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {deadlines.map((d) => (
                      <li key={d.id} className="flex items-start gap-2 text-xs">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-neutral-200 truncate">{d.title}</p>
                          <p className="text-[11px] text-neutral-500 truncate">
                            {d.project_scope ? `${d.project_scope} / ` : ''}
                            {d.project_name}
                            {d.assignee_name ? ` · ${d.assignee_name}` : ''}
                          </p>
                        </div>
                        <span className="text-[11px] text-amber-300 shrink-0 whitespace-nowrap">
                          {new Date(d.due_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Aktivitas terbaru */}
              <div className="rounded-xl border border-neutral-800/80 bg-[#191a1e] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <History size={15} className="text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Aktivitas Terbaru</h3>
                </div>
                {activity.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-3">Belum ada aktivitas.</p>
                ) : (
                  <ul className="space-y-2">
                    {activity.map((a) => (
                      <li key={a.id} className="flex items-start gap-2 text-xs">
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            a.kind === 'comment' ? 'bg-blue-400' : 'bg-emerald-400'
                          }`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-neutral-200 truncate">{a.title}</p>
                          <p className="text-[11px] text-neutral-500 truncate">{a.detail}</p>
                        </div>
                        <span className="text-[11px] text-neutral-500 shrink-0 whitespace-nowrap">
                          {new Date(a.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Scope Of Work Section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5 gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">Scope Of Work</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSeedDemo}
                  disabled={seedingDemo}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-neutral-300 hover:text-white bg-[#1b1c20] hover:bg-neutral-800 border border-neutral-700/80 text-sm font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {seedingDemo ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  <span>{seedingDemo ? 'Memuat…' : 'Muat contoh'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewScopeName('')
                    setCreateError('')
                    setShowNewScopeModal(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>New Scope</span>
                </button>
              </div>
            </div>

            {demoNotice && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <Check size={16} className="mt-0.5 shrink-0" />
                <span>{demoNotice}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-neutral-400 py-10">
                <Loader2 size={16} className="animate-spin" /> Memuat project…
              </div>
            ) : scopes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-700/80 bg-[#191a1e] px-6 py-12 text-center">
                <p className="text-sm text-neutral-400">
                  Belum ada scope. Buat scope pertama, atau muat contoh project lengkap untuk
                  melihat tampilan board yang sudah terisi.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewScopeName('')
                      setCreateError('')
                      setShowNewScopeModal(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition cursor-pointer"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>New Scope</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedDemo}
                    disabled={seedingDemo}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-neutral-300 hover:text-white bg-[#1b1c20] hover:bg-neutral-800 border border-neutral-700/80 text-sm font-medium rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {seedingDemo ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Sparkles size={15} />
                    )}
                    <span>{seedingDemo ? 'Memuat…' : 'Muat contoh project'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {scopes.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openScopeModal(item)}
                    className="group bg-[#191a1e] border border-neutral-800/80 rounded-xl overflow-hidden shadow-sm hover:border-blue-500/50 hover:shadow-blue-500/10 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    <div className="h-40 sm:h-44 w-full relative overflow-hidden bg-neutral-900">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover object-center grayscale contrast-110 group-hover:scale-105 group-hover:grayscale-0 transition-all duration-300"
                      />
                    </div>
                    <div className="px-4 py-3 bg-[#191a1e] flex items-center justify-between">
                      <h3 className="text-sm font-medium text-neutral-200 group-hover:text-white transition">
                        {item.title}
                      </h3>
                      <span className="text-[10px] text-neutral-500">
                        {cardsFrom(item.title).length} card
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* My Member Section */}
          <section
            ref={membersSectionRef}
            className="border border-neutral-800/80 rounded-2xl bg-[#141517] p-5 sm:p-6 lg:p-7 shadow-sm"
          >
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white tracking-tight mb-4">My Member</h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3">
                <div className="relative flex-1 max-w-md">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                  />
                  <input
                    ref={memberSearchRef}
                    type="text"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    placeholder="Search My Member"
                    className="w-full h-10 pl-10 pr-4 bg-[#1b1c20] border border-neutral-700/70 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
                <div className="relative self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowMemberSort((v) => !v)}
                    className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white cursor-pointer px-2 py-1.5"
                  >
                    <ArrowUpDown size={14} />
                    <span>{MEMBER_SORT_LABEL[memberSort]}</span>
                    <ChevronDown size={15} />
                  </button>
                  {showMemberSort && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowMemberSort(false)} />
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 z-30">
                        {(Object.keys(MEMBER_SORT_LABEL) as MemberSort[]).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setMemberSort(key)
                              setShowMemberSort(false)
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                              memberSort === key
                                ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                : 'text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <span>{MEMBER_SORT_LABEL[key]}</span>
                            {memberSort === key && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800/80 text-xs text-neutral-400 font-medium">
                    <th className="pb-3 font-normal">Member Name</th>
                    <th className="pb-3 text-right font-normal">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="group hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={member.name}
                            src={member.avatar_url}
                            size={36}
                          />
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-blue-400 transition">
                              {member.name}
                            </p>
                            <p className="text-xs text-neutral-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pl-4 text-right text-xs sm:text-sm text-neutral-400 whitespace-nowrap">
                        {member.role === 'project_manager' ? 'Project Manager' : 'Member'}
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-sm text-neutral-500">
                        {profiles.length === 0
                          ? 'Belum ada anggota yang bisa ditampilkan.'
                          : `No members found matching "${searchMember}"`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* =================== CREATE NEW SCOPE MODAL =================== */}
      {showNewScopeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowNewScopeModal(false)}
          />
          <form
            onSubmit={handleCreateScope}
            className="relative w-full max-w-lg bg-[#1e2025] border border-[#343740] rounded-xl shadow-2xl z-10 p-6 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Create New Scope</h2>
              <button
                type="button"
                onClick={() => setShowNewScopeModal(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer -mt-1"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <input
              type="text"
              autoFocus
              value={newScopeName}
              onChange={(e) => setNewScopeName(e.target.value)}
              placeholder="scope name"
              className="w-full h-14 px-4 bg-transparent border border-neutral-700/80 rounded-lg text-base text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition"
            />

            {createError && <p className="mt-3 text-xs text-red-400">{createError}</p>}

            <div className="flex items-center justify-end pt-6">
              <button
                type="submit"
                disabled={!newScopeName.trim() || creating}
                className="h-10 px-5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shadow-sm transition cursor-pointer active:scale-95"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================== CREATE NEW CARD MODAL =================== */}
      {showNewCardModal && selectedScope && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowNewCardModal(false)}
          />
          <form
            onSubmit={handleCreateCard}
            className="relative w-full max-w-lg bg-[#1e2025] border border-[#343740] rounded-xl shadow-2xl z-10 p-6 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Create New Card</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Scope: <span className="text-neutral-200 font-medium">{selectedScope.title}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCardModal(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer -mt-1"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                autoFocus
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                placeholder="card name"
                className="w-full h-14 px-4 bg-transparent border border-neutral-700/80 rounded-lg text-base text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition"
              />
              <textarea
                rows={3}
                value={newCardDesc}
                onChange={(e) => setNewCardDesc(e.target.value)}
                placeholder="description (optional)"
                className="w-full px-4 py-3 bg-transparent border border-neutral-700/80 rounded-lg text-sm text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition resize-none"
              />

              <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-lg border border-neutral-700/60 bg-[#191a1e] px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={newCardWithTemplate}
                  onChange={(e) => setNewCardWithTemplate(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-neutral-600 bg-transparent accent-blue-600 cursor-pointer"
                />
                <span className="text-xs text-neutral-300 leading-relaxed">
                  Sertakan contoh tugas
                  <span className="block text-[11px] text-neutral-500 mt-0.5">
                    Grup, tugas, subtask, dan isi tab Doc langsung terisi sebagai template kerja.
                  </span>
                </span>
              </label>
            </div>

            {createError && <p className="mt-3 text-xs text-red-400">{createError}</p>}

            <div className="flex items-center justify-end pt-6">
              <button
                type="submit"
                disabled={!newCardName.trim() || creating}
                className="h-10 px-5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shadow-sm transition cursor-pointer active:scale-95"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================== SCOPE DETAIL MODAL =================== */}
      {selectedScope && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2"
          role="dialog"
          aria-modal="true"
          aria-label={`Scope Of Work - ${selectedScope.title}`}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeScopeModal} />

          {/* Modal Panel */}
          <div className="relative w-[96vw] h-[94vh] bg-[#111214] border border-neutral-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 pt-6 pb-4 border-b border-neutral-800/60 shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Scope Of Work / <span className="font-extrabold">{selectedScope.title}</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={closeScopeModal}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>

            {/* Modal Toolbar */}
            <div className="flex items-center gap-3 px-6 sm:px-8 py-4 shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full h-9 pl-9 pr-4 bg-[#1b1c20] border border-neutral-700/70 rounded-lg text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
              <button
                type="button"
                onClick={openNewCardModal}
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer shrink-0"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>New Card</span>
              </button>
            </div>

            {/* Modal Cards Grid */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-6">
              {filteredModalCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-neutral-500 text-sm">
                  <span>
                    {modalCards.length === 0
                      ? 'Belum ada card di scope ini.'
                      : `No cards found matching "${modalSearch}"`}
                  </span>
                  {modalCards.length === 0 && (
                    <button
                      type="button"
                      onClick={openNewCardModal}
                      className="inline-flex items-center gap-1.5 h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition cursor-pointer"
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>New Card</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                  {filteredModalCards.map((card) => {
                    const pct = card.total ? Math.round((card.done / card.total) * 100) : 0
                    const isStarred = favorites.some((f) => f.id === card.id)
                    return (
                      <div
                        key={card.id}
                        onClick={() =>
                          router.push(
                            `/project/${slugify(selectedScope.title)}/${slugify(card.name)}`,
                          )
                        }
                        className="group bg-[#1b1c20] border border-neutral-800/70 rounded-xl p-4 hover:border-blue-500/40 hover:shadow-blue-500/5 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col gap-3"
                      >
                        {/* Card Top Row */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-white leading-snug">
                            {card.name}
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditProject(card)
                              }}
                              className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-700/60 transition cursor-pointer"
                              aria-label={`Ubah project ${card.name}`}
                              title="Ubah project"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                const project = projects.find((p) => p.id === card.id)
                                if (!project) return
                                setProjectActionError('')
                                setDeletingProject(project)
                              }}
                              className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                              aria-label={`Hapus project ${card.name}`}
                              title="Hapus project"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleFavorite(card, selectedScope.title)
                              }}
                              className={`p-1 rounded transition cursor-pointer ${
                                isStarred ? 'text-yellow-400' : 'text-neutral-500 hover:text-yellow-400'
                              }`}
                              aria-label={isStarred ? 'Hapus dari favorit' : 'Jadikan favorit'}
                              title={isStarred ? 'Hapus dari favorit' : 'Jadikan favorit'}
                            >
                              <Star
                                size={14}
                                strokeWidth={1.8}
                                fill={isStarred ? 'currentColor' : 'none'}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3 flex-1">
                          {card.description || 'Belum ada deskripsi.'}
                        </p>

                        {/* Progress Bar */}
                        <div className="mt-auto space-y-1.5">
                          <div className="w-full h-1.5 bg-neutral-700/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-500">
                            {card.total === 0
                              ? 'Belum ada tugas'
                              : `${card.done}/${card.total} tugas selesai`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================== EDIT PROJECT MODAL (F-03) =================== */}
      {editingProject && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingProject(null)}
          />
          <form
            onSubmit={handleSaveProject}
            className="relative w-full max-w-lg bg-[#1e2025] border border-[#343740] rounded-xl shadow-2xl z-10 p-6"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Ubah Project</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Scope: <span className="text-neutral-200 font-medium">{editingProject.scope}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer -mt-1"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Nama Project
                </label>
                <input
                  type="text"
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="nama project"
                  className="w-full h-12 px-4 bg-transparent border border-neutral-700/80 rounded-lg text-base text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="deskripsi (opsional)"
                  className="w-full px-4 py-3 bg-transparent border border-neutral-700/80 rounded-lg text-sm text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition resize-none"
                />
              </div>
            </div>

            {projectActionError && (
              <p className="mt-3 text-xs text-red-400">{projectActionError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-xs text-neutral-400 hover:text-white transition px-3 py-1.5 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!editName.trim() || projectActionBusy}
                className="h-10 px-5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shadow-sm transition cursor-pointer active:scale-95"
              >
                {projectActionBusy ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================== DELETE PROJECT CONFIRM (F-03) =================== */}
      {deletingProject && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDeletingProject(null)}
          />
          <div className="relative w-full max-w-sm bg-[#1e2025] border border-[#343740] rounded-xl shadow-2xl z-10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 size={17} className="text-red-400" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white">Hapus Project</h2>
                <p className="text-xs text-neutral-400">
                  <span className="font-semibold text-neutral-200">{deletingProject.name}</span>{' '}
                  akan dihapus.
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-300">
              Seluruh grup, tugas, subtask, komentar, dan dokumen di dalamnya ikut terhapus.
              Tindakan ini tidak bisa dibatalkan.
            </p>

            {projectActionError && (
              <p className="mt-3 text-xs text-red-400">{projectActionError}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-5">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="text-xs text-neutral-400 hover:text-white transition px-3 py-1.5 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={projectActionBusy}
                className="h-8 px-4 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-sm transition cursor-pointer active:scale-95"
              >
                {projectActionBusy ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  )
}
