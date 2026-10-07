'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Users,
  Search,
  Home,
  ChevronDown,
  Settings,
  MoreHorizontal,
  Plus,
  X,
  Star,
  LogOut,
} from 'lucide-react'

interface ScopeItem {
  id: string
  title: string
  image: string
}

interface MemberItem {
  id: string
  name: string
  email: string
  lastVisited: string
  avatarColor: string
}

interface ProjectCard {
  id: string
  name: string
  description: string
  progress: number
  total: number
  starred: boolean
}

const scopeItems: ScopeItem[] = [
  { id: '1', title: 'Client', image: '/images/scope/scope-client.jpg' },
  { id: '2', title: 'Marketplace', image: '/images/scope/scope-marketplace.jpg' },
  { id: '3', title: 'Mockup', image: '/images/scope/scope-mockup.jpg' },
  { id: '4', title: 'Studio Client', image: '/images/scope/scope-studio.jpg' },
  { id: '5', title: 'Font', image: '/images/scope/scope-font.jpg' },
]

// Generate sample project cards for each scope
const generateCards = (scopeTitle: string): ProjectCard[] => {
  const names = ['Aqua', 'Aqua', 'Aqua', 'Aqua', 'Aqua', 'Aqua', 'Aqua']
  const progresses = [95, 95, 85, 95, 95, 95, 95]
  return names.map((name, i) => ({
    id: `${scopeTitle}-${i}`,
    name,
    description: `Kolaborasi dengan ${name.toUpperCase()} untuk merencanakan dan mengelola secara optimal.`,
    progress: progresses[i],
    total: 100,
    starred: false,
  }))
}

const initialMembers: MemberItem[] = [
  { id: '1', name: 'Jordan Fufu', email: 'Jordan@example.com', lastVisited: 'Today', avatarColor: 'bg-amber-500' },
  { id: '2', name: 'Puput Atira', email: 'Puput@example.com', lastVisited: 'Yesterday', avatarColor: 'bg-blue-500' },
  { id: '3', name: 'Rahmat Sudianto', email: 'RahmatSudianto@example.com', lastVisited: 'February 1 , 2026', avatarColor: 'bg-purple-500' },
  { id: '4', name: 'Rahmat Sudianto', email: 'RahmatSudianto@example.com', lastVisited: 'February 1 , 2026', avatarColor: 'bg-emerald-500' },
  { id: '5', name: 'Rahmat Sudianto', email: 'RahmatSudianto@example.com', lastVisited: 'February 1 , 2026', avatarColor: 'bg-rose-500' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [searchMember, setSearchMember] = useState('')
  const [activeNav, setActiveNav] = useState('Home')
  const [selectedWorkspace] = useState('2026 INVISUAL')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Modal state
  const [selectedScope, setSelectedScope] = useState<ScopeItem | null>(null)
  const [modalCards, setModalCards] = useState<ProjectCard[]>([])
  const [modalSearch, setModalSearch] = useState('')
  const [starredCards, setStarredCards] = useState<Set<string>>(new Set())

  const openScopeModal = (item: ScopeItem) => {
    setSelectedScope(item)
    setModalCards(generateCards(item.title))
    setModalSearch('')
  }

  const closeScopeModal = () => {
    setSelectedScope(null)
    setModalCards([])
  }

  const toggleStar = (cardId: string) => {
    setStarredCards(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  const filteredModalCards = modalCards.filter(c =>
    c.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
    c.description.toLowerCase().includes(modalSearch.toLowerCase())
  )

  const filteredMembers = initialMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.email.toLowerCase().includes(searchMember.toLowerCase())
  )

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
          <button type="button" className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer" aria-label="Notifications">
            <Bell size={18} strokeWidth={1.8} />
          </button>
          <button type="button" className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer" aria-label="Team group">
            <Users size={18} strokeWidth={1.8} />
          </button>
          <button type="button" className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer" aria-label="Search">
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
              G
            </button>

            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 w-52 bg-[#1b1c20] border border-neutral-800/90 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex flex-col items-center text-center p-2 pb-3 border-b border-neutral-800/80">
                    <div className="w-12 h-12 rounded-full border border-neutral-600 overflow-hidden bg-neutral-800 flex items-center justify-center mb-2">
                      <span className="text-base font-bold text-neutral-300">G</span>
                    </div>
                    <p className="text-sm font-semibold text-white tracking-tight">
                      George Frederic
                    </p>
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
                      onClick={() => router.push('/signin')}
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
                onClick={() => setActiveNav('Home')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  activeNav === 'Home' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <Home size={18} strokeWidth={1.8} />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('Favorites')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  activeNav === 'Favorites' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <span>Favorites</span>
                <ChevronDown size={15} strokeWidth={1.8} />
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('Settings')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  activeNav === 'Settings' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <Settings size={18} strokeWidth={1.8} />
                <span>Settings</span>
              </button>
            </nav>

            <div className="pt-2">
              <div className="flex items-center justify-between text-neutral-400 px-2 mb-3">
                <span className="text-sm font-medium text-neutral-300">Workspaces</span>
                <div className="flex items-center gap-2">
                  <button type="button" className="hover:text-white transition cursor-pointer p-1" aria-label="Workspace options">
                    <MoreHorizontal size={16} />
                  </button>
                  <button type="button" className="hover:text-white transition cursor-pointer p-1" aria-label="Search workspace">
                    <Search size={15} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-between bg-[#191a1e] border border-neutral-700/80 rounded-xl px-3 py-2 text-sm cursor-pointer hover:border-neutral-600 transition">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-5 h-5 rounded bg-fuchsia-500 text-white text-xs font-bold flex items-center justify-center shrink-0">I</span>
                    <span className="text-xs font-semibold text-white truncate">{selectedWorkspace}</span>
                  </div>
                  <ChevronDown size={15} className="text-neutral-400 shrink-0" />
                </div>
                <button
                  type="button"
                  onClick={() => alert('Add workspace')}
                  className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition shadow-sm cursor-pointer"
                  aria-label="Add workspace"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 xl:p-12 overflow-y-auto">
          <div className="mb-8">
            <p className="text-xs sm:text-sm text-neutral-400 font-normal">Thursday, February 19 2026</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1">Hello, George</h1>
          </div>

          {/* Scope Of Work Section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white tracking-tight">Scope Of Work</h2>
              <button
                type="button"
                onClick={() => alert('New Scope action')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-150 cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>New Scope</span>
              </button>
            </div>

            {/* Grid of Scope Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {scopeItems.map((item) => (
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
                  <div className="px-4 py-3 bg-[#191a1e]">
                    <h3 className="text-sm font-medium text-neutral-200 group-hover:text-white transition">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* My Member Section */}
          <section className="border border-neutral-800/80 rounded-2xl bg-[#141517] p-5 sm:p-6 lg:p-7 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white tracking-tight mb-4">My Member</h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    placeholder="Search My Member"
                    className="w-full h-10 pl-10 pr-4 bg-[#1b1c20] border border-neutral-700/70 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
                <div className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white cursor-pointer px-2 py-1.5 self-end sm:self-auto">
                  <span>Sort by</span>
                  <ChevronDown size={15} />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800/80 text-xs text-neutral-400 font-medium">
                    <th className="pb-3 font-normal">Member Name</th>
                    <th className="pb-3 text-right font-normal">Last Visited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="group hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${member.avatarColor} text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                            {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-blue-400 transition">{member.name}</p>
                            <p className="text-xs text-neutral-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pl-4 text-right text-xs sm:text-sm text-neutral-400 whitespace-nowrap">{member.lastVisited}</td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-sm text-neutral-500">
                        No members found matching &quot;{searchMember}&quot;
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* =================== SCOPE DETAIL MODAL =================== */}
      {selectedScope && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2"
          role="dialog"
          aria-modal="true"
          aria-label={`Scope Of Work - ${selectedScope.title}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeScopeModal}
          />

          {/* Modal Panel */}
          <div className="relative w-[96vw] h-[94vh] bg-[#111214] border border-neutral-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 pt-6 pb-4 border-b border-neutral-800/60 shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Scope Of Work /{' '}
                  <span className="font-extrabold">{selectedScope.title}</span>
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
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
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
                onClick={() => alert('New Card')}
                className="inline-flex items-center gap-1.5 h-9 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all duration-150 cursor-pointer shrink-0"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>New Card</span>
              </button>
            </div>

            {/* Modal Cards Grid */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-6">
              {filteredModalCards.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-neutral-500 text-sm">
                  No cards found matching &quot;{modalSearch}&quot;
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                  {filteredModalCards.map((card) => {
                    const pct = Math.round((card.progress / card.total) * 100)
                    const isStarred = starredCards.has(card.id)
                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          const scopeSlug = selectedScope ? selectedScope.title.toLowerCase().replace(/\s+/g, '-') : 'client'
                          const cardSlug = card.name.toLowerCase().replace(/\s+/g, '-')
                          router.push(`/project/${scopeSlug}/${cardSlug}`)
                        }}
                        className="group bg-[#1b1c20] border border-neutral-800/70 rounded-xl p-4 hover:border-blue-500/40 hover:shadow-blue-500/5 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col gap-3"
                      >
                        {/* Card Top Row */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-white leading-snug">{card.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleStar(card.id) }}
                            className={`p-0.5 rounded transition cursor-pointer shrink-0 ${
                              isStarred ? 'text-yellow-400' : 'text-neutral-500 hover:text-yellow-400'
                            }`}
                            aria-label={isStarred ? 'Unstar' : 'Star'}
                          >
                            <Star
                              size={15}
                              strokeWidth={1.8}
                              fill={isStarred ? 'currentColor' : 'none'}
                            />
                          </button>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3 flex-1">
                          {card.description}
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
                            {card.progress}/{card.total}
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
    </div>
  )
}
