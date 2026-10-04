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
  Undo2,
  Redo2,
  AlignLeft,
  List,
  ListOrdered,
  ListTodo,
  AtSign,
  Clock,
  Download,
  Calendar as CalendarIcon,
} from 'lucide-react'

interface TaskItem {
  id: string
  title: string
  hasChevron?: boolean
  personAvatars: string[]
  status: 'In Queue' | 'Working on it' | 'Done'
  date: string
  checked: boolean
}

interface TaskGroup {
  id: string
  title: string
  color: string
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

  // Doc tab state
  type TextStyleType = 'normal' | 'h1' | 'h2' | 'h3' | 'quote'

  const textStyleOptions: {
    type: TextStyleType
    short: string
    label: string
    description: string
  }[] = [
    { type: 'normal', short: 'T', label: 'Normal Text', description: 'Normal Text' },
    { type: 'h1', short: 'H1', label: 'Large Title', description: 'Large Title' },
    { type: 'h2', short: 'H2', label: 'Medium Text', description: 'Medium Text' },
    { type: 'h3', short: 'H3', label: 'Small Text', description: 'Small Text' },
    { type: 'quote', short: '<>', label: 'Quote', description: 'Quote' },
  ]

  const [selectedTextStyle, setSelectedTextStyle] = useState<TextStyleType>('normal')
  const [showTextStyleDropdown, setShowTextStyleDropdown] = useState(false)
  const [docParagraph, setDocParagraph] = useState(
    'Platform ini dirancang untuk membantu mengelola pekerjaan secara lebih terstruktur dan efisien. Dengan fitur yang intuitif, pengguna dapat mengatur tugas, berkolaborasi dengan tim, serta memantau perkembangan proyek dalam satu tempat yang terintegrasi.'
  )
  const [isEditingParagraph, setIsEditingParagraph] = useState(false)
  const [docNotes, setDocNotes] = useState('')
  const [isEditingDocNotes, setIsEditingDocNotes] = useState(false)

  const getTextStyleClasses = (style: TextStyleType) => {
    switch (style) {
      case 'h1':
        return 'text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug'
      case 'h2':
        return 'text-xl sm:text-2xl font-bold text-white tracking-normal leading-snug'
      case 'h3':
        return 'text-base sm:text-lg font-semibold text-neutral-200 leading-normal'
      case 'quote':
        return 'text-sm sm:text-base italic text-neutral-300 pl-4 py-2.5 border-l-4 border-blue-500 bg-[#16171b]/80 rounded-r-lg leading-relaxed shadow-sm'
      case 'normal':
      default:
        return 'text-sm text-neutral-300 leading-relaxed font-normal'
    }
  }

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
              Done: 'In Queue',
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
                {/* Main Table Tab */}
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
                  {activeTab === 'Main Table' && (
                    <MoreHorizontal size={14} className="text-neutral-500" />
                  )}
                </button>

                {/* Calendar Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('Calendar')}
                  className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'Calendar'
                      ? 'border-white text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>Calendar</span>
                  {activeTab === 'Calendar' && (
                    <MoreHorizontal size={14} className="text-neutral-500" />
                  )}
                </button>

                {/* Doc Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('Doc')}
                  className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'Doc'
                      ? 'border-white text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>Doc</span>
                  {activeTab === 'Doc' && (
                    <MoreHorizontal size={14} className="text-neutral-500" />
                  )}
                </button>

                {/* Add Tab */}
                <button
                  type="button"
                  className="pb-3 text-neutral-400 hover:text-white transition cursor-pointer p-0.5"
                  aria-label="Add tab"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* TAB 1: MAIN TABLE */}
            {activeTab === 'Main Table' && (
              <>
                {/* Action Toolbar for Main Table */}
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
                      <Search
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
                      />
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
                                          <ChevronRight
                                            size={14}
                                            className="text-neutral-500 shrink-0"
                                          />
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
              </>
            )}

            {/* TAB 2: DOC (CLIENT BRIEF) */}
            {activeTab === 'Doc' && (
              <div className="flex-1 flex flex-col">
                {/* Doc Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pb-4 mb-6 border-b border-neutral-800/80 text-neutral-300 text-xs">
                  {/* + Add Button */}
                  <button
                    type="button"
                    onClick={() => setIsEditingDocNotes(true)}
                    className="inline-flex items-center gap-1.5 h-7 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-md transition cursor-pointer shadow-sm mr-1"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add</span>
                  </button>

                  {/* Undo / Redo */}
                  <div className="flex items-center gap-1 px-1">
                    <button
                      type="button"
                      className="p-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer"
                      title="Undo"
                    >
                      <Undo2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer"
                      title="Redo"
                    >
                      <Redo2 size={15} />
                    </button>
                  </div>

                  <div className="w-px h-4 bg-neutral-800 mx-1" />

                  {/* Text Style Dropdown: T=Normal Text, H1=Large Title, H2=Medium Text, H3=Small Text, <>=Quote */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTextStyleDropdown(!showTextStyleDropdown)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:text-white hover:bg-neutral-800/60 rounded-md transition cursor-pointer text-xs font-medium border border-transparent hover:border-neutral-700/60"
                      title="Change text size / style"
                    >
                      <span className="w-4 h-4 rounded bg-neutral-800 text-blue-400 font-bold text-[10px] flex items-center justify-center">
                        {textStyleOptions.find(o => o.type === selectedTextStyle)?.short}
                      </span>
                      <span>{textStyleOptions.find(o => o.type === selectedTextStyle)?.label}</span>
                      <ChevronDown size={13} className="text-neutral-500" />
                    </button>

                    {showTextStyleDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowTextStyleDropdown(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-60 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
                            Format Text
                          </div>
                          <div className="p-1 space-y-0.5">
                            {textStyleOptions.map((opt) => {
                              const isSelected = selectedTextStyle === opt.type
                              return (
                                <button
                                  key={opt.type}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTextStyle(opt.type)
                                    setShowTextStyleDropdown(false)
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition cursor-pointer hover:bg-neutral-800/80 ${
                                    isSelected
                                      ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                      : 'text-neutral-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded bg-[#202227] border border-neutral-700/80 text-blue-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                                      {opt.short}
                                    </span>
                                    <div>
                                      <p className="font-medium text-xs leading-none">
                                        {opt.label}
                                      </p>
                                      <p className="text-[10px] text-neutral-500 mt-0.5">
                                        {opt.short} &bull; {opt.description}
                                      </p>
                                    </div>
                                  </div>
                                  {isSelected && <Check size={14} className="text-blue-500" />}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Alignment Dropdown */}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-1.5 py-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer text-xs"
                    title="Align text"
                  >
                    <AlignLeft size={15} />
                    <ChevronDown size={11} className="text-neutral-500" />
                  </button>

                  {/* List Options */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="p-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer"
                      title="Bullet list"
                    >
                      <List size={15} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer"
                      title="Numbered list"
                    >
                      <ListOrdered size={15} />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer"
                      title="Checklist"
                    >
                      <ListTodo size={15} />
                    </button>
                  </div>

                  <div className="w-px h-4 bg-neutral-800 mx-1" />

                  {/* Style */}
                  <button
                    type="button"
                    className="px-2 py-1 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer text-xs"
                  >
                    Style
                  </button>

                  {/* Mention @ */}
                  <button
                    type="button"
                    className="p-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer"
                    title="Mention member"
                  >
                    <AtSign size={15} />
                  </button>
                </div>

                {/* Doc Content Area */}
                <div className="max-w-4xl space-y-6">
                  {/* Doc Title Heading */}
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
                      Doc
                    </h1>

                    {/* Metadata Header */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-400">
                      {/* Creator */}
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800 shrink-0">
                          <Image
                            src="/images/clients/SUNDDAE.jpg"
                            alt="George"
                            width={20}
                            height={20}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span>
                          Creator <strong className="text-white font-semibold">George</strong>
                        </span>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <span>Created</span>
                        <span className="text-neutral-200">Apr 13,2026, 20:56</span>
                      </div>

                      {/* Last Updated */}
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Clock size={13} className="text-neutral-500" />
                        <span>Last updated</span>
                        <span className="text-neutral-200">Apr 13,2026, 22:43</span>
                      </div>
                    </div>
                  </div>

                  {/* Client Brief Main Paragraph (Styled dynamically by selectedTextStyle: T, H1, H2, H3, <>) */}
                  <div className="group relative">
                    {isEditingParagraph ? (
                      <div className="space-y-2">
                        <textarea
                          value={docParagraph}
                          onChange={(e) => setDocParagraph(e.target.value)}
                          rows={4}
                          autoFocus
                          className="w-full p-3 bg-[#191a1e] border border-neutral-700 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingParagraph(false)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md transition cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingParagraph(false)}
                            className="px-3 py-1.5 text-neutral-400 hover:text-white text-xs transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsEditingParagraph(true)}
                        title="Click to edit text, or change size via dropdown above (T, H1, H2, H3, <>)"
                        className={`${getTextStyleClasses(selectedTextStyle)} cursor-pointer rounded-lg p-1.5 -ml-1.5 hover:bg-white/[0.03] transition group`}
                      >
                        {selectedTextStyle === 'quote' ? (
                          <blockquote>&ldquo;{docParagraph}&rdquo;</blockquote>
                        ) : (
                          docParagraph
                        )}
                      </div>
                    )}
                  </div>

                  {/* Attached Word Document Card */}
                  <div className="pt-2">
                    <div className="w-56 rounded-xl overflow-hidden border border-neutral-800 bg-[#16171b] hover:border-neutral-700 hover:shadow-lg transition-all cursor-pointer group">
                      {/* Word Icon Container */}
                      <div className="h-28 bg-[#3b82f6] flex items-center justify-center relative group-hover:brightness-105 transition">
                        <span className="text-4xl font-extrabold text-white font-serif tracking-tighter drop-shadow-sm select-none">
                          W
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            alert('Downloading harga-Makanan-terbaru.docx')
                          }}
                          className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition"
                          title="Download document"
                        >
                          <Download size={14} />
                        </button>
                      </div>

                      {/* Document Name Footer */}
                      <div className="px-3.5 py-2.5 bg-[#141517] border-t border-neutral-800/80">
                        <p className="text-xs text-neutral-300 font-medium truncate group-hover:text-blue-400 transition">
                          harga-Makanan-terbaru.docx
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Attached Image Preview */}
                  <div className="pt-2">
                    <div className="w-64 h-40 rounded-xl overflow-hidden border border-neutral-800/80 relative shadow-md group cursor-pointer hover:border-neutral-700 transition">
                      <Image
                        src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=80"
                        alt="Brief Image Reference"
                        width={256}
                        height={160}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>

                  {/* Interactive Start Writing / Note Row */}
                  <div className="pt-4 border-t border-neutral-800/60">
                    {isEditingDocNotes ? (
                      <div className="space-y-3">
                        <textarea
                          value={docNotes}
                          onChange={(e) => setDocNotes(e.target.value)}
                          placeholder="Type notes or project brief details here..."
                          autoFocus
                          rows={4}
                          className="w-full p-3 bg-[#191a1e] border border-neutral-700 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingDocNotes(false)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                          >
                            Save Note
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingDocNotes(false)}
                            className="px-3 py-1.5 text-neutral-400 hover:text-white text-xs transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setIsEditingDocNotes(true)}
                        className="flex items-center gap-2.5 cursor-pointer text-neutral-500 hover:text-neutral-400 group py-1 select-none"
                      >
                        <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center group-hover:bg-blue-500 transition shadow-sm">
                          <Plus size={14} strokeWidth={2.5} />
                        </span>
                        <span className="text-xs sm:text-sm text-neutral-400 group-hover:text-neutral-300 transition">
                          {docNotes ? docNotes : 'Type something here to start writing'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CALENDAR VIEW */}
            {activeTab === 'Calendar' && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-blue-500 mb-4 shadow-inner">
                  <CalendarIcon size={28} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Project Calendar & Timeline</h3>
                <p className="text-sm text-neutral-400 max-w-md mb-6">
                  Tenggat waktu pengerjaan tugas & milestone untuk Aqua dijadwalkan pada 28 - 29
                  Maret 2025.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#191a1e] border border-neutral-800 rounded-xl text-xs text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Timeline: Mar 28, 2025 – Mar 29, 2025</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
