'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Bell,
  Users,
  Search,
  Home,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MoreHorizontal,
  Plus,
  ArrowLeft,
  User as UserIcon,
  Filter,
  ArrowUpDown,
  Check,
} from 'lucide-react'

interface TaskItem {
  id: string
  title: string
  hasChevron?: boolean
  personAvatars: string[] // image urls or identifiers
  status: 'In Queue' | 'Working on it' | 'Done'
  date: string
  checked: boolean
}

interface TaskGroup {
  id: string
  title: string
  color: string // Tailwind color class for title
  collapsed: boolean
  dateRange: string
  items: TaskItem[]
}

const initialGroups: TaskGroup[] = [
  {
    id: 'group-1',
    title: 'Tugas Pertama',
    color: 'text-[#6c7ff5]',
    collapsed: false,
    dateRange: 'Mar 28 - 29',
    items: [
      {
        id: 't-1-1',
        title: 'buat logo aqua',
        hasChevron: true,
        personAvatars: ['/images/clients/SUNDDAE.jpg'],
        status: 'In Queue',
        date: 'Mar 28, 2025',
        checked: false,
      },
      {
        id: 't-1-2',
        title: 'apadah',
        hasChevron: true,
        personAvatars: ['/images/clients/CONTROVERSIAL.webp', '/images/clients/KONA.webp'],
        status: 'Working on it',
        date: 'Mar 28, 2025',
        checked: false,
      },
    ],
  },
  {
    id: 'group-2',
    title: 'Tugas Kedua',
    color: 'text-[#ea384c]',
    collapsed: false,
    dateRange: 'Mar 28 - 29',
    items: [
      {
        id: 't-2-1',
        title: 'apadah',
        hasChevron: false,
        personAvatars: ['/images/clients/ASIAN-MOOD.webp'],
        status: 'In Queue',
        date: 'Mar 28, 2025',
        checked: false,
      },
      {
        id: 't-2-2',
        title: 'logo',
        hasChevron: false,
        personAvatars: ['/images/clients/SOAR.webp'],
        status: 'Working on it',
        date: 'Mar 28, 2025',
        checked: false,
      },
    ],
  },
  {
    id: 'group-3',
    title: 'Tugas Ketiga',
    color: 'text-[#22c55e]',
    collapsed: true,
    dateRange: 'Mar 29 - 30',
    items: [
      {
        id: 't-3-1',
        title: 'Review Brand Assets',
        hasChevron: false,
        personAvatars: ['/images/clients/GRIZZLE.webp'],
        status: 'In Queue',
        date: 'Mar 29, 2025',
        checked: false,
      },
    ],
  },
]

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()

  const rawScope = (params?.scope as string) || 'client'
  const rawCard = (params?.card as string) || 'aqua'

  const scopeTitle = rawScope.charAt(0).toUpperCase() + rawScope.slice(1).replace(/-/g, ' ')
  const cardTitle = rawCard.charAt(0).toUpperCase() + rawCard.slice(1).replace(/-/g, ' ')

  const [activeTab, setActiveTab] = useState<'Main Table' | 'Calendar' | 'Doc'>('Main Table')
  const [groups, setGroups] = useState<TaskGroup[]>(initialGroups)
  const [activeNav, setActiveNav] = useState('Home')
  const [selectedWorkspace] = useState('2026 INVISUAL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)

  // Toggle group collapse
  const toggleGroupCollapse = (groupId: string) => {
    setGroups(prev =>
      prev.map(g => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))
    )
  }

  // Toggle task checkbox
  const toggleTaskCheck = (groupId: string, taskId: string) => {
    setGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map(t => (t.id === taskId ? { ...t, checked: !t.checked } : t)),
        }
      })
    )
  }

  // Cycle status: In Queue -> Working on it -> Done -> In Queue
  const cycleStatus = (groupId: string, taskId: string) => {
    setGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map(t => {
            if (t.id !== taskId) return t
            const nextStatus: Record<TaskItem['status'], TaskItem['status']> = {
              'In Queue': 'Working on it',
              'Working on it': 'Done',
              'Done': 'In Queue',
            }
            return { ...t, status: nextStatus[t.status] }
          }),
        }
      })
    )
  }

  // Add a new item to the first expanded group
  const handleAddNewItem = () => {
    const targetGroup = groups.find(g => !g.collapsed) || groups[0]
    const newItemTitle = prompt('Enter new task title:')
    if (!newItemTitle || !newItemTitle.trim()) return

    setGroups(prev =>
      prev.map(g => {
        if (g.id !== targetGroup.id) return g
        const newItem: TaskItem = {
          id: `task-${Date.now()}`,
          title: newItemTitle.trim(),
          hasChevron: true,
          personAvatars: ['/images/clients/CONTROVERSIAL.webp'],
          status: 'In Queue',
          date: 'Mar 28, 2025',
          checked: false,
        }
        return { ...g, items: [...g.items, newItem] }
      })
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#111214] text-white flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="w-full h-16 bg-[#111214] border-b border-neutral-800/80 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/home" className="inline-flex items-center gap-2.5">
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
            className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
            aria-label="Team group"
          >
            <Users size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
            aria-label="Search"
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
          {/* Profile Avatar */}
          <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-600/70 ml-1 cursor-pointer hover:border-neutral-400 transition shrink-0">
            <Image
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
              alt="User Profile"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* Main Layout: Left Sidebar + Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Sidebar */}
        <aside className="w-full lg:w-64 bg-[#111214] border-r border-neutral-800/80 p-4 lg:min-h-[calc(100vh-4rem)] flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveNav('Home')
                  router.push('/home')
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  activeNav === 'Home'
                    ? 'text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <Home size={18} strokeWidth={1.8} />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('Favorites')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                  activeNav === 'Favorites'
                    ? 'text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                }`}
              >
                <span>Favorites</span>
                <ChevronDown size={15} strokeWidth={1.8} />
              </button>
            </nav>

            <div className="pt-2">
              <div className="flex items-center justify-between text-neutral-400 px-2 mb-3">
                <span className="text-sm font-medium text-neutral-300">Workspaces</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="hover:text-white transition cursor-pointer p-1"
                    aria-label="Workspace options"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  <button
                    type="button"
                    className="hover:text-white transition cursor-pointer p-1"
                    aria-label="Search workspace"
                  >
                    <Search size={15} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-between bg-[#191a1e] border border-neutral-700/80 rounded-xl px-3 py-2 text-sm cursor-pointer hover:border-neutral-600 transition">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-5 h-5 rounded bg-fuchsia-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      I
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {selectedWorkspace}
                    </span>
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

        {/* Main Content Pane */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-[#0d0e11]">
          {/* Outer Rounded Board Card */}
          <div className="w-full bg-[#141517] border border-neutral-800/80 rounded-2xl p-6 lg:p-8 min-h-[calc(100vh-7rem)] flex flex-col shadow-2xl">
            {/* Breadcrumb Header */}
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => router.push('/home')}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800/60 transition cursor-pointer"
                aria-label="Back to home"
              >
                <ArrowLeft size={20} strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2 text-xl font-normal">
                <span className="text-neutral-400">{scopeTitle}</span>
                <span className="text-neutral-600">/</span>
                <span className="text-white font-bold tracking-tight">{cardTitle}</span>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex items-center justify-between border-b border-neutral-800/80 mb-6">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('Main Table')}
                  className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'Main Table'
                      ? 'border-white text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>Main Table</span>
                  <MoreHorizontal size={14} className="text-neutral-500" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('Calendar')}
                  className={`pb-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'Calendar'
                      ? 'border-white text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('Doc')}
                  className={`pb-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'Doc'
                      ? 'border-white text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Doc
                </button>
                <button
                  type="button"
                  className="pb-3 text-neutral-400 hover:text-white transition cursor-pointer p-0.5"
                  aria-label="Add tab"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* New item button */}
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-l-md transition cursor-pointer"
                >
                  <span>New item</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="inline-flex items-center px-1.5 h-8 bg-blue-600 hover:bg-blue-500 border-l border-blue-700 active:scale-95 text-white text-xs rounded-r-md transition cursor-pointer"
                  aria-label="More new item options"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Search Toggle */}
              {showSearchInput ? (
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    autoFocus
                    onBlur={() => !searchQuery && setShowSearchInput(false)}
                    className="h-8 pl-8 pr-3 bg-[#191a1e] border border-neutral-700 rounded-md text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSearchInput(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/60 rounded-md text-xs transition cursor-pointer"
                >
                  <Search size={14} />
                  <span>Search</span>
                </button>
              )}

              {/* Person button */}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/60 rounded-md text-xs transition cursor-pointer"
              >
                <UserIcon size={14} />
                <span>Person</span>
              </button>

              {/* Filter button */}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/60 rounded-md text-xs transition cursor-pointer"
              >
                <Filter size={14} />
                <span>Filter</span>
                <ChevronDown size={12} className="text-neutral-400" />
              </button>

              {/* Sort button */}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/60 rounded-md text-xs transition cursor-pointer"
              >
                <ArrowUpDown size={14} />
                <span>Sort</span>
              </button>

              {/* More button */}
              <button
                type="button"
                className="inline-flex items-center justify-center h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-md text-xs transition cursor-pointer"
                aria-label="More actions"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* Task Groups Table Container */}
            <div className="space-y-8 flex-1">
              {groups.map((group) => {
                const filteredItems = group.items.filter((item) =>
                  item.title.toLowerCase().includes(searchQuery.toLowerCase())
                )

                // Calculate status distribution for progress bar
                const totalItems = group.items.length || 1
                const inQueueCount = group.items.filter(i => i.status === 'In Queue').length
                const workingCount = group.items.filter(i => i.status === 'Working on it').length
                const doneCount = group.items.filter(i => i.status === 'Done').length

                const inQueuePct = (inQueueCount / totalItems) * 100
                const workingPct = (workingCount / totalItems) * 100
                const donePct = (doneCount / totalItems) * 100

                return (
                  <div key={group.id} className="space-y-2">
                    {/* Group Header Title */}
                    <div
                      onClick={() => toggleGroupCollapse(group.id)}
                      className="flex items-center gap-2 cursor-pointer select-none py-1 group/header w-fit"
                    >
                      {group.collapsed ? (
                        <ChevronUp size={16} className={`${group.color} transition-transform`} />
                      ) : (
                        <ChevronDown size={16} className={`${group.color} transition-transform`} />
                      )}
                      <span className={`text-sm font-semibold tracking-wide ${group.color}`}>
                        {group.title}
                      </span>
                    </div>

                    {/* Table View (When Expanded) */}
                    {!group.collapsed && (
                      <div className="overflow-x-auto rounded-lg">
                        <table className="w-full text-left border-collapse border border-neutral-800/80">
                          {/* Table Column Headers */}
                          <thead>
                            <tr className="border-b border-neutral-800/80 text-xs text-neutral-400 font-normal">
                              {/* Selection Checkbox */}
                              <th className="w-12 px-3 py-2 text-center border-r border-neutral-800/80">
                                <div className="w-4 h-4 rounded border border-neutral-600 mx-auto" />
                              </th>
                              <th className="px-4 py-2 border-r border-neutral-800/80 font-normal min-w-[260px]">
                                Item
                              </th>
                              <th className="w-36 px-4 py-2 border-r border-neutral-800/80 font-normal text-center">
                                Person
                              </th>
                              <th className="w-44 px-4 py-2 border-r border-neutral-800/80 font-normal text-center">
                                Status
                              </th>
                              <th className="w-44 px-4 py-2 border-r border-neutral-800/80 font-normal text-center">
                                Date
                              </th>
                              <th className="w-12 px-2 py-2 text-center">
                                <Plus size={14} className="mx-auto text-neutral-400" />
                              </th>
                            </tr>
                          </thead>

                          {/* Table Body */}
                          <tbody>
                            {filteredItems.map((item) => (
                              <tr
                                key={item.id}
                                className="border-b border-neutral-800/60 hover:bg-white/[0.02] transition-colors group/row"
                              >
                                {/* Checkbox */}
                                <td className="px-3 py-2.5 text-center border-r border-neutral-800/80">
                                  <button
                                    type="button"
                                    onClick={() => toggleTaskCheck(group.id, item.id)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer mx-auto ${
                                      item.checked
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'border-neutral-600 hover:border-neutral-400'
                                    }`}
                                  >
                                    {item.checked && <Check size={12} strokeWidth={3} />}
                                  </button>
                                </td>

                                {/* Item Name */}
                                <td className="px-4 py-2.5 border-r border-neutral-800/80">
                                  <div className="flex items-center gap-2">
                                    {item.hasChevron && (
                                      <ChevronRight size={14} className="text-neutral-500 shrink-0" />
                                    )}
                                    <span className="text-xs text-neutral-200 font-medium">
                                      {item.title}
                                    </span>
                                  </div>
                                </td>

                                {/* Person Avatars */}
                                <td className="px-4 py-2.5 border-r border-neutral-800/80 text-center">
                                  <div className="flex items-center justify-center -space-x-1.5">
                                    {item.personAvatars.map((av, idx) => (
                                      <div
                                        key={idx}
                                        className="w-6 h-6 rounded-full overflow-hidden border border-neutral-800 bg-neutral-700 shrink-0"
                                      >
                                        <Image
                                          src={av}
                                          alt="Assignee"
                                          width={24}
                                          height={24}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </td>

                                {/* Status Badge */}
                                <td className="p-0 border-r border-neutral-800/80">
                                  <button
                                    type="button"
                                    onClick={() => cycleStatus(group.id, item.id)}
                                    title="Click to cycle status"
                                    className={`w-full h-full py-2.5 px-3 text-center text-xs font-semibold tracking-wide transition cursor-pointer flex items-center justify-center ${
                                      item.status === 'In Queue'
                                        ? 'bg-[#ffa114] text-neutral-950 hover:brightness-105'
                                        : item.status === 'Working on it'
                                        ? 'bg-[#ea384c] text-white hover:brightness-105'
                                        : 'bg-[#22c55e] text-white hover:brightness-105'
                                    }`}
                                  >
                                    {item.status}
                                  </button>
                                </td>

                                {/* Date */}
                                <td className="px-4 py-2.5 border-r border-neutral-800/80 text-center text-xs text-neutral-300">
                                  {item.date}
                                </td>

                                {/* Extra column */}
                                <td className="px-2 py-2.5 text-center text-neutral-600"></td>
                              </tr>
                            ))}

                            {/* Summary / Progress Bar Footer Row */}
                            <tr className="border-b border-neutral-800/80 bg-transparent">
                              <td className="border-r border-neutral-800/80 py-2"></td>
                              <td className="border-r border-neutral-800/80 py-2"></td>
                              <td className="border-r border-neutral-800/80 py-2"></td>

                              {/* Dual-color Progress Bar */}
                              <td className="p-1 border-r border-neutral-800/80">
                                <div className="h-6 w-full rounded flex overflow-hidden">
                                  {inQueuePct > 0 && (
                                    <div
                                      style={{ width: `${inQueuePct}%` }}
                                      className="bg-[#ffa114] h-full transition-all duration-300"
                                      title={`In Queue: ${inQueueCount}`}
                                    />
                                  )}
                                  {workingPct > 0 && (
                                    <div
                                      style={{ width: `${workingPct}%` }}
                                      className="bg-[#ea384c] h-full transition-all duration-300"
                                      title={`Working on it: ${workingCount}`}
                                    />
                                  )}
                                  {donePct > 0 && (
                                    <div
                                      style={{ width: `${donePct}%` }}
                                      className="bg-[#22c55e] h-full transition-all duration-300"
                                      title={`Done: ${doneCount}`}
                                    />
                                  )}
                                </div>
                              </td>

                              {/* Date range pill */}
                              <td className="py-1 px-3 border-r border-neutral-800/80 text-center">
                                <div className="inline-block px-3 py-1 bg-[#1e2025] border border-neutral-700/60 rounded text-[11px] text-neutral-300 font-normal">
                                  {group.dateRange}
                                </div>
                              </td>

                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
