'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  findProject,
  loadBoard,
  listWorkspaces,
  createWorkspace,
  createTask,
  updateTask as updateTaskRow,
  deleteTasks,
  createGroup,
  createStatus,
  deleteStatus,
  updateStatusColor,
  addSubtask as addSubtaskRow,
  setSubtaskDone,
  deleteSubtask as deleteSubtaskRow,
  addComment as addCommentRow,
  likeComment,
  saveDoc,
  addMemberByEmail,
  getSessionProfile,
  type Workspace,
} from '@/lib/db'
import {
  Bell,
  ThumbsUp,
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
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ListTodo,
  AtSign,
  Clock,
  Download,
  Calendar as CalendarIcon,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Trash2,
  ImageIcon,
  FileText,
  Minus,
  Sparkles,
  Quote as QuoteIcon,
  Heading1,
  Heading2,
  Heading3,
  Type,
  X,
  CheckSquare,
  Edit3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Mail,
  Folder,
  Tag,
  Circle,
  Paperclip,
  Smile,
  Send,
  ChevronsRight,
  LayoutGrid,
} from 'lucide-react'

// ======================== STATUS CONFIGURATION ========================
export type TaskStatus = string

export interface StatusDef {
  id: string
  label: string
  colorCode: string
}

// Kolom Kanban baku sesuai skripsi: To Do -> In Progress -> Review -> Done.
// Daftar ini dipakai bersama oleh Main Table, dropdown status, dan papan Kanban.
export const initialStatusList: StatusDef[] = [
  { id: 'todo',        label: 'To Do',       colorCode: '#64748b' },
  { id: 'in-progress', label: 'In Progress', colorCode: '#3b82f6' },
  { id: 'review',      label: 'Review',      colorCode: '#ffa114' },
  { id: 'done',        label: 'Done',        colorCode: '#22c55e' },
]

// Colour palette for the add-label modal
export const COLOR_PALETTE = [
  '#ea384c', '#f97316', '#ffa114', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
  '#64748b', '#78716c', '#b91c1c', '#0284c7', '#16a34a',
  '#7c3aed', '#db2777', '#0891b2', '#059669', '#d97706',
]

// 40 colors palette (5 columns x 8 rows) matching Monday.com color picker
export const MONDAY_PALETTE = [
  '#9333ea', '#ec4899', '#f43f5e', '#f97316', '#fb923c',
  '#06b6d4', '#10b981', '#84cc16', '#eab308', '#f59e0b',
  '#3b82f6', '#6366f1', '#8b5cf6', '#db2777', '#e11d48',
  '#059669', '#0d9488', '#0284c7', '#94a3b8', '#64748b',
  '#475569', '#52525b', '#525252', '#57534e', '#3f3f46',
  '#581c87', '#1e3a8a', '#134e4a', '#14532d', '#7f1d1d',
  '#c084fc', '#6ee7b7', '#fde047', '#7dd3fc', '#f1f5f9',
  '#ffffff', '#27272a', '#0f172a', '#831843', '#064e3b',
]

export const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Pengguna yang sedang login — dipakai untuk komentar & uploader lampiran.
export const CURRENT_USER = {
  name: 'George Frederik',
  avatar:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
}

// ======================== TASK & GROUP INTERFACES ========================
// Helper: get a light text colour for very dark/light bg
export function getContrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#0a0a0a' : '#ffffff'
}

// Konversi tanggal UI ("Mar 28, 2025") <-> ISO (kolom `date` di Postgres).
function toISODate(value: string): string | null {
  const d = new Date(value)
  return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10)
}

function fromISODate(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(+d) ? value : `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export interface TaskItem {
  id: string
  title: string
  hasChevron?: boolean
  description?: string
  personAvatars: string[]
  personNames?: string[]
  status: TaskStatus
  date: string
  checked: boolean
  expanded?: boolean
  subtasks?: { id: string; text: string; done: boolean }[]
  attachments?: { id: string; name: string; owner?: string; avatar?: string }[]
  comments?: {
    id: string
    author: string
    text: string
    time: string
    avatar?: string
    likes?: number
    reactions?: number
    replies?: { id: string; author: string; text: string; time: string; avatar?: string }[]
  }[]
}

export interface TaskGroup {
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
        description: 'Desain ulang logo Aqua dalam resolusi tinggi dengan variasi warna.',
        personAvatars: ['/images/clients/SUNDDAE.jpg'],
        personNames: ['George'],
        status: 'To Do',
        date: 'Mar 28, 2025',
        checked: false,
        expanded: false,
        subtasks: [
          { id: 'sub-1', text: 'Kumpulkan referensi logo', done: true },
          { id: 'sub-2', text: 'Sketsa 3 alternatif', done: false },
        ],
        attachments: [
          { id: 'att-1', name: 'Revisi dari client.pdf', owner: 'George', avatar: '/images/clients/SUNDDAE.jpg' },
          { id: 'att-2', name: 'Revisi dari client.pdf', owner: 'Puput', avatar: '/images/clients/ASIAN-MOOD.webp' },
        ],
        comments: [
          {
            id: 'cm-1',
            author: 'George Frederik',
            text: 'Perbaiki ini',
            time: 'Yesterday at 4:10 AM',
            avatar: CURRENT_USER.avatar,
            likes: 0,
          },
        ],
      },
      {
        id: 't-1-2',
        title: 'apadah',
        hasChevron: true,
        description: 'Eksplorasi konsep dan moodboard visual untuk media sosial.',
        personAvatars: ['/images/clients/CONTROVERSIAL.webp', '/images/clients/KONA.webp'],
        personNames: ['Jordan Fufu', 'Puput Atira'],
        status: 'In Progress',
        date: 'Mar 28, 2025',
        checked: false,
        expanded: false,
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
        description: 'Persiapan materi publikasi dan aset packaging.',
        personAvatars: ['/images/clients/ASIAN-MOOD.webp'],
        personNames: ['Puput Atira'],
        status: 'To Do',
        date: 'Mar 28, 2025',
        checked: false,
        expanded: false,
      },
      {
        id: 't-2-2',
        title: 'logo',
        hasChevron: false,
        description: 'Finishing logo vector SVG dan guideline brand.',
        personAvatars: ['/images/clients/SOAR.webp'],
        personNames: ['Rahmat Sudianto'],
        status: 'In Progress',
        date: 'Mar 28, 2025',
        checked: false,
        expanded: false,
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
        description: 'Meeting review akhir bersama tim lead.',
        personAvatars: ['/images/clients/GRIZZLE.webp'],
        personNames: ['George'],
        status: 'Review',
        date: 'Mar 29, 2025',
        checked: false,
        expanded: false,
      },
    ],
  },
]

// ======================== DOC BLOCK INTERFACES ========================
export type TextStyleType = 'normal' | 'h1' | 'h2' | 'h3' | 'quote'
export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'bullet-list'
  | 'numbered-list'
  | 'checklist'
  | 'file'
  | 'image'
  | 'divider'

export interface ListItem {
  id: string
  text: string
  checked?: boolean
}

export interface DocBlock {
  id: string
  type: BlockType
  content: string
  items?: ListItem[]
  fileData?: {
    name: string
    size: string
    icon: string
  }
  imageUrl?: string
  align?: 'left' | 'center' | 'right' | 'justify'
  styles?: {
    bold?: boolean
    italic?: boolean
    underline?: boolean
    strikethrough?: boolean
    color?: string
    bg?: string
  }
}

const initialDocBlocks: DocBlock[] = [
  {
    id: 'block-1',
    type: 'paragraph',
    content:
      'Platform ini dirancang untuk membantu mengelola pekerjaan secara lebih terstruktur dan efisien. Dengan fitur yang intuitif, pengguna dapat mengatur tugas, berkolaborasi dengan tim, serta memantau perkembangan proyek dalam satu tempat yang terintegrasi.',
    align: 'left',
    styles: {},
  },
  {
    id: 'block-2',
    type: 'file',
    content: '',
    fileData: {
      name: 'harga-Makanan-terbaru.docx',
      size: '245 KB',
      icon: 'W',
    },
  },
  {
    id: 'block-3',
    type: 'image',
    content: 'Referensi visual produk',
    imageUrl:
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop&q=80',
  },
]

export interface Member {
  id: string
  name: string
  role: string
  avatar: string
}

const initialMembers: Member[] = [
  { id: 'm-0', name: 'Balok Farmer', role: 'Product Manager', avatar: '/images/clients/SUNDDAE.jpg' },
  { id: 'm-01', name: 'Afira cendera', role: 'Design Lead', avatar: '/images/clients/ASIAN-MOOD.webp' },
  { id: 'm-1', name: 'George', role: 'Product Lead', avatar: '/images/clients/SUNDDAE.jpg' },
  { id: 'm-2', name: 'Jordan Fufu', role: 'Senior Designer', avatar: '/images/clients/CONTROVERSIAL.webp' },
  { id: 'm-3', name: 'Puput Atira', role: 'UI/UX Designer', avatar: '/images/clients/ASIAN-MOOD.webp' },
  { id: 'm-4', name: 'Rahmat Sudianto', role: 'Illustrator', avatar: '/images/clients/SOAR.webp' },
]

// ======================== CUSTOM VIEWS (Gantt / Chart) ========================
interface CustomView {
  id: string
  name: string
  type: 'gantt' | 'chart'
}

function GanttView({ groups, statusList }: { groups: TaskGroup[]; statusList: StatusDef[] }) {
  const tasks = groups.flatMap((g) => g.items.map((t) => ({ task: t, group: g })))
  const dates = tasks
    .map((t) => new Date(t.task.date).getTime())
    .filter((n) => !Number.isNaN(n))
  if (tasks.length === 0) {
    return <p className="text-sm text-neutral-500 py-10 text-center">Belum ada tugas untuk ditampilkan.</p>
  }
  const min = Math.min(...dates)
  const max = Math.max(...dates)
  const span = Math.max(max - min, 86400000) // minimal 1 hari
  return (
    <div className="space-y-2">
      {tasks.map(({ task, group }) => {
        const d = new Date(task.date).getTime()
        const left = Number.isNaN(d) ? 0 : ((d - min) / span) * 100
        const sd = statusList.find((s) => s.label === task.status)
        return (
          <div key={task.id} className="flex items-center gap-3">
            <div className="w-52 shrink-0 min-w-0">
              <p className="text-xs font-medium text-white truncate">{task.title}</p>
              <p className="text-[10px] text-neutral-500 truncate">{group.title}</p>
            </div>
            <div className="relative flex-1 h-7 bg-[#191a1e] rounded-md border border-neutral-800/70">
              <div
                className="absolute top-1/2 -translate-y-1/2 h-4 rounded-full min-w-[42px] flex items-center px-2 text-[10px] font-semibold text-white truncate"
                style={{ left: `calc(${left}% - 0px)`, backgroundColor: sd?.colorCode || '#3b82f6' }}
                title={task.date}
              >
                {task.date}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ChartView({ groups, statusList }: { groups: TaskGroup[]; statusList: StatusDef[] }) {
  const allTasks = groups.flatMap((g) => g.items)
  const total = allTasks.length || 1
  return (
    <div className="space-y-4 max-w-xl">
      <p className="text-xs text-neutral-400">Distribusi status ({allTasks.length} tugas)</p>
      {statusList.map((s) => {
        const count = allTasks.filter((t) => t.status === s.label).length
        const pct = (count / total) * 100
        return (
          <div key={s.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-300">{s.label}</span>
              <span className="text-neutral-500">
                {count} ({Math.round(pct)}%)
              </span>
            </div>
            <div className="h-6 bg-[#191a1e] rounded-md overflow-hidden border border-neutral-800/70">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: s.colorCode }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ======================== CALENDAR VIEW COMPONENT ========================
interface CalendarViewProps {
  groups: TaskGroup[]
  statusList: StatusDef[]
  members: Member[]
  getContrastTextFn: (hex: string) => string
  onAddTask: (date: string) => void
}

function CalendarView({ groups, statusList, members, getContrastTextFn, onAddTask }: CalendarViewProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 1)) // March 2026
  const [hoveredEvent, setHoveredEvent] = useState<{ task: TaskItem; groupTitle: string; rect?: DOMRect } | null>(null)
  const [clickedDay, setClickedDay] = useState<number | null>(null)

  // Toolbar filter/sort state
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [personFilter, setPersonFilter] = useState('all')
  const [showPersonMenu, setShowPersonMenu] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [sortOption, setSortOption] = useState<'none' | 'name-asc' | 'date-asc'>('none')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [mode, setMode] = useState<'month' | 'agenda'>('month')
  const [showModeMenu, setShowModeMenu] = useState(false)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const rawMonthName = currentMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  const monthName = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1)

  // Monday-first calculation (0 = Mon, ..., 6 = Sun)
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const firstDayOffset = (firstDay + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // All tasks flattened with group info, then filtered + sorted per toolbar
  const allTasks = groups
    .flatMap((g) => g.items.map((item) => ({ task: item, groupTitle: g.title, groupColor: g.color })))
    .filter(({ task }) => {
      if (query && !task.title.toLowerCase().includes(query.toLowerCase())) return false
      if (personFilter !== 'all' && !(task.personNames || []).includes(personFilter)) return false
      if (statusFilter !== 'all' && task.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortOption === 'name-asc') return a.task.title.localeCompare(b.task.title)
      if (sortOption === 'date-asc')
        return new Date(a.task.date).getTime() - new Date(b.task.date).getTime()
      return 0
    })

  // Parse task date → match to calendar cell
  const getTasksForDay = (day: number): typeof allTasks => {
    return allTasks.filter((t) => {
      try {
        const d = new Date(t.task.date)
        return d.getMonth() === month && d.getDate() === day
      } catch {
        return false
      }
    })
  }

  const formatDateForModal = (day: number) => {
    const d = new Date(year, month, day)
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))
  const goToday = () => setCurrentMonth(new Date(2026, 2, 1))

  const isToday = (day: number) =>
    (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) ||
    (year === 2026 && month === 2 && day === 17)

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Build calendar grid cells
  const cells: { day: number; current: boolean }[] = []
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true })
  }
  const remainder = cells.length % 7
  if (remainder !== 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      cells.push({ day: d, current: false })
    }
  }

  const statusDef = (label: string) =>
    statusList.find((s) => s.label === label) || { colorCode: '#64748b', label }

  return (
    <div className="flex-1 flex flex-col select-none">
      {/* Top Toolbar matching screenshot */}
      <div className="flex items-center justify-between mb-4">
        {/* Left Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAddTask(formatDateForModal(today.getDate()))}
            className="h-8 px-3 text-xs font-semibold text-white bg-[#0073ea] hover:bg-blue-600 rounded-md transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>New item</span>
            <ChevronDown size={13} />
          </button>
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            className={`h-8 px-2.5 text-xs rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              showSearch || query
                ? 'text-white bg-neutral-800'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Search size={14} />
            <span>Search</span>
          </button>
          {showSearch && (
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari tugas..."
              className="h-8 px-2.5 w-40 bg-[#191a1e] border border-neutral-700 rounded-md text-xs text-white placeholder:text-neutral-500 outline-none focus:border-blue-500"
            />
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowPersonMenu((v) => !v)
                setShowStatusMenu(false)
                setShowSortMenu(false)
                setShowModeMenu(false)
              }}
              className={`h-8 px-2.5 text-xs rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                personFilter !== 'all'
                  ? 'text-white bg-neutral-800'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <UserIcon size={14} />
              <span>{personFilter === 'all' ? 'Person' : personFilter}</span>
            </button>
            {showPersonMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowPersonMenu(false)} />
                <div className="absolute left-0 top-full mt-1 w-48 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 z-30 max-h-60 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setPersonFilter('all'); setShowPersonMenu(false) }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                  >
                    Semua orang
                  </button>
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setPersonFilter(m.name); setShowPersonMenu(false) }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                        personFilter === m.name
                          ? 'bg-blue-600/15 text-blue-400 font-semibold'
                          : 'text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowStatusMenu((v) => !v)
                setShowPersonMenu(false)
                setShowSortMenu(false)
                setShowModeMenu(false)
              }}
              className={`h-8 px-2.5 text-xs rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                statusFilter !== 'all'
                  ? 'text-white bg-neutral-800'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Filter size={14} />
              <span>{statusFilter === 'all' ? 'Filter' : statusFilter}</span>
              <ChevronDown size={12} />
            </button>
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowStatusMenu(false)} />
                <div className="absolute left-0 top-full mt-1 w-48 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 z-30">
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('all'); setShowStatusMenu(false) }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                  >
                    Semua status
                  </button>
                  {statusList.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setStatusFilter(s.label); setShowStatusMenu(false) }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                        statusFilter === s.label
                          ? 'bg-blue-600/15 text-blue-400 font-semibold'
                          : 'text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowSortMenu((v) => !v)
                setShowPersonMenu(false)
                setShowStatusMenu(false)
                setShowModeMenu(false)
              }}
              className={`h-8 px-2.5 text-xs rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                sortOption !== 'none'
                  ? 'text-white bg-neutral-800'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <ArrowUpDown size={14} />
              <span>Sort</span>
            </button>
            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowSortMenu(false)} />
                <div className="absolute left-0 top-full mt-1 w-44 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 z-30">
                  {([
                    { v: 'none', label: 'Default' },
                    { v: 'name-asc', label: 'Nama (A-Z)' },
                    { v: 'date-asc', label: 'Tanggal (terdekat)' },
                  ] as const).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => { setSortOption(o.v); setShowSortMenu(false) }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                        sortOption === o.v
                          ? 'bg-blue-600/15 text-blue-400 font-semibold'
                          : 'text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="h-8 px-3 text-xs font-medium text-neutral-300 border border-neutral-700/80 bg-neutral-800/20 hover:bg-neutral-800 rounded-md transition cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-md transition cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-md transition cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="text-xs font-semibold text-neutral-200 min-w-[70px] text-center">
            {monthName}
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowModeMenu((v) => !v)
                setShowPersonMenu(false)
                setShowStatusMenu(false)
                setShowSortMenu(false)
              }}
              className="h-8 px-2.5 text-xs font-medium text-neutral-300 border border-neutral-700/80 bg-neutral-800/20 hover:bg-neutral-800 rounded-md transition flex items-center gap-1 cursor-pointer"
            >
              <span>{mode === 'month' ? 'Month' : 'Agenda'}</span>
              <ChevronDown size={12} />
            </button>
            {showModeMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowModeMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-32 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 z-30">
                  {(['month', 'agenda'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setShowModeMenu(false) }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize transition cursor-pointer ${
                        mode === m
                          ? 'bg-blue-600/15 text-blue-400 font-semibold'
                          : 'text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Day Headers (Mon - Sun) */}
      {mode === 'month' && (
      <>
      <div className="grid grid-cols-7 border-t border-l border-r border-neutral-800/80">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-normal text-neutral-400 bg-[#16171a] border-r border-neutral-800/80 last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-l border-t border-neutral-800/80 flex-1">
        {cells.map((cell, idx) => {
          const tasks = cell.current ? getTasksForDay(cell.day) : []
          const isTodayCell = isToday(cell.day) && cell.current

          return (
            <div
              key={idx}
              className={`min-h-[110px] p-2 border-r border-b border-neutral-800/80 flex flex-col justify-between transition-colors duration-150 cursor-pointer group relative ${
                !cell.current
                  ? 'bg-[#141518]/70 text-neutral-600'
                  : 'bg-[#1a1b1f] hover:bg-[#383a42]'
              }`}
              onClick={() => {
                if (!cell.current) return
                onAddTask(formatDateForModal(cell.day))
              }}
            >
              {/* Day Number (Top Right) */}
              <div className="flex justify-end relative z-20 pointer-events-none">
                {isTodayCell ? (
                  <span className="bg-blue-600 text-white font-semibold text-xs px-1.5 py-0.5 rounded-sm flex items-center justify-center min-w-[20px] text-center">
                    {String(cell.day).padStart(2, '0')}
                  </span>
                ) : (
                  <span
                    className={`text-xs font-normal ${
                      cell.current ? 'text-neutral-400 group-hover:text-neutral-300' : 'text-neutral-600'
                    }`}
                  >
                    {String(cell.day).padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Centered + Add text on Hover */}
              {cell.current && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                  <span className="text-xs text-neutral-300 font-normal select-none">
                    + Add
                  </span>
                </div>
              )}

              {/* Task Pills */}
              <div className="space-y-1 relative z-20 mt-auto">
                {tasks.slice(0, 2).map(({ task, groupTitle }) => {
                  const sd = statusDef(task.status)
                  const displayTitle = task.title ? task.title.charAt(0).toUpperCase() + task.title.slice(1) : ''
                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setClickedDay(cell.day)
                      }}
                      onMouseEnter={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setHoveredEvent({ task, groupTitle, rect })
                      }}
                      onMouseLeave={() => setHoveredEvent(null)}
                      className="w-full py-1 px-3 rounded-full text-xs font-medium text-white text-center truncate cursor-pointer shadow-sm hover:brightness-110 transition"
                      style={{
                        backgroundColor: sd.colorCode || '#ea384c',
                      }}
                      title={task.title}
                    >
                      {displayTitle}
                    </div>
                  )
                })}
                {tasks.length > 2 && (
                  <div className="text-[10px] text-neutral-400 pl-1 font-medium">+{tasks.length - 2} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      </>
      )}

      {/* Agenda mode */}
      {mode === 'agenda' && (
        <div className="border border-neutral-800/80 rounded-lg overflow-hidden">
          {allTasks.length === 0 ? (
            <p className="text-sm text-neutral-500 py-10 text-center">Tidak ada tugas.</p>
          ) : (
            allTasks.map(({ task, groupTitle }) => {
              const sd = statusDef(task.status)
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800/60 hover:bg-white/[0.02] transition"
                >
                  <span className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: sd.colorCode }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{task.title}</p>
                    <p className="text-[11px] text-neutral-500">{groupTitle}</p>
                  </div>
                  <span className="text-xs text-neutral-400 whitespace-nowrap">{task.date}</span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold shrink-0"
                    style={{ backgroundColor: sd.colorCode, color: getContrastTextFn(sd.colorCode) }}
                  >
                    {task.status}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
      {clickedDay !== null && (() => {
        const dayTasks = getTasksForDay(clickedDay)
        return (
          <div className="mt-4 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-blue-400" />
                <span className="text-sm font-bold text-white">
                  {new Date(year, month, clickedDay).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAddTask(formatDateForModal(clickedDay))}
                  className="h-7 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  Add Event
                </button>
                <button
                  type="button"
                  onClick={() => setClickedDay(null)}
                  className="p-1 text-neutral-400 hover:text-white rounded transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {dayTasks.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No tasks scheduled for this day. Click "Add Event" to create one.</p>
            ) : (
              <div className="space-y-2">
                {dayTasks.map(({ task, groupTitle }) => {
                  const sd = statusDef(task.status)
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-[#111214] border border-neutral-800 hover:border-neutral-700 transition"
                    >
                      <div
                        className="w-1 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: sd.colorCode }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{task.title}</p>
                        <p className="text-[10px] text-neutral-500">{groupTitle}</p>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold shrink-0"
                        style={{
                          backgroundColor: sd.colorCode,
                          color: getContrastTextFn(sd.colorCode),
                        }}
                      >
                        {task.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* Status Legend matching the Kanban columns */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 py-2">
        {statusList.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: s.colorCode }} />
            <span className="text-xs text-neutral-300">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ======================== KANBAN BOARD VIEW COMPONENT ========================
interface KanbanViewProps {
  groups: TaskGroup[]
  statusList: StatusDef[]
  onMoveTask: (taskId: string, groupId: string, newStatus: string) => void
  onAddTask: (statusLabel: string) => void
  onOpenTask: (groupId: string, taskId: string) => void
}

function KanbanView({ groups, statusList, onMoveTask, onAddTask, onOpenTask }: KanbanViewProps) {
  const [dragged, setDragged] = useState<{ taskId: string; groupId: string } | null>(null)
  const [overStatus, setOverStatus] = useState<string | null>(null)

  const flat = groups.flatMap((g) => g.items.map((t) => ({ task: t, group: g })))

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 -mx-1 px-1">
      {statusList.map((status) => {
        const column = flat.filter((x) => x.task.status === status.label)
        const isOver = overStatus === status.id
        return (
          <div
            key={status.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOverStatus(status.id)
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setOverStatus((s) => (s === status.id ? null : s))
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragged) onMoveTask(dragged.taskId, dragged.groupId, status.label)
              setDragged(null)
              setOverStatus(null)
            }}
            className={`w-72 shrink-0 rounded-xl border bg-[#191a1e] flex flex-col transition-colors ${
              isOver ? 'border-blue-500/80' : 'border-neutral-800/80'
            }`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-neutral-800/70">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: status.colorCode }} />
                <span className="text-sm font-semibold text-white truncate">{status.label}</span>
                <span className="text-xs text-neutral-500">{column.length}</span>
              </div>
              <button
                type="button"
                onClick={() => onAddTask(status.label)}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800/60 p-1 rounded-md transition cursor-pointer"
                aria-label={`Tambah tugas ke ${status.label}`}
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2.5 p-3 min-h-[120px]">
              {column.length === 0 && (
                <p className="text-xs text-neutral-600 text-center py-6 select-none">Tidak ada tugas</p>
              )}
              {column.map(({ task, group }) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragged({ taskId: task.id, groupId: group.id })}
                  onDragEnd={() => {
                    setDragged(null)
                    setOverStatus(null)
                  }}
                  onClick={() => onOpenTask(group.id, task.id)}
                  className="bg-[#1b1c20] border border-neutral-800/70 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-blue-500/40 transition-colors"
                >
                  <p className="text-sm font-medium text-white leading-snug line-clamp-2">{task.title}</p>
                  {task.description && (
                    <p className="mt-1 text-xs text-neutral-500 leading-relaxed line-clamp-2">{task.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400 min-w-0">
                      <Folder size={11} className="shrink-0" />
                      <span className="truncate max-w-[110px]">{group.title}</span>
                    </span>
                    <span className="text-[10px] text-neutral-400 whitespace-nowrap">{task.date}</span>
                  </div>
                  {task.personNames && task.personNames.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex items-center -space-x-2">
                        {task.personAvatars.slice(0, 4).map((src, i) => (
                          <span
                            key={i}
                            className="relative w-5 h-5 rounded-full border border-[#1b1c20] overflow-hidden bg-neutral-700"
                          >
                            <Image src={src} alt={task.personNames?.[i] || 'Member'} fill sizes="20px" className="object-cover" />
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-neutral-400 truncate">{task.personNames.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()

  const rawScope = (params?.scope as string) || 'client'
  const rawCard = (params?.card as string) || 'aqua'

  const scopeTitle = rawScope.charAt(0).toUpperCase() + rawScope.slice(1).replace(/-/g, ' ')
  const cardTitle = rawCard.charAt(0).toUpperCase() + rawCard.slice(1).replace(/-/g, ' ')

  const [activeTab, setActiveTab] = useState<string>('Main Table')
  const [groups, setGroups] = useState<TaskGroup[]>(initialGroups)
  const [activeNav, setActiveNav] = useState('Home')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { id: 'seed-1', name: '2026 INVISUAL', owner_id: null },
    { id: 'seed-2', name: '2025 INVISUAL', owner_id: null },
    { id: 'seed-3', name: '2024 INVISUAL', owner_id: null },
  ])
  const [selectedWorkspace, setSelectedWorkspace] = useState('2026 INVISUAL')
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const [workspaceSearch, setWorkspaceSearch] = useState('')
  const [showAddWorkspaceModal, setShowAddWorkspaceModal] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [customViews, setCustomViews] = useState<CustomView[]>([])
  const [showAddViewMenu, setShowAddViewMenu] = useState(false)

  // ======================== DYNAMIC STATUS LIST ========================
  const [statusList, setStatusList] = useState<StatusDef[]>(initialStatusList)

  // ======================== SUPABASE LOAD ========================
  const [projectId, setProjectId] = useState<string | null>(null)
  // Pengguna yang sedang login, dipakai untuk komentar & lampiran.
  const [me, setMe] = useState(CURRENT_USER)

  // Muat board dari Supabase. Kalau project belum ada di DB, data contoh tetap tampil.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const project = await findProject(rawScope, rawCard)
      if (!project) return
      const board = await loadBoard(project.id)
      if (!alive) return

      listWorkspaces()
        .then((rows) => {
          if (alive && rows.length) setWorkspaces(rows)
        })
        .catch(() => {})

      getSessionProfile()
        .then((p) => {
          if (alive && p) setMe({ name: p.name, avatar: p.avatar_url || CURRENT_USER.avatar })
        })
        .catch(() => {})

      setProjectId(project.id)
      if (board.statuses.length) {
        setStatusList(
          board.statuses.map((s) => ({ id: s.id, label: s.label, colorCode: s.color_code })),
        )
      }
      if (board.members.length) {
        setMembers(
          board.members.map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            avatar: m.avatar_url || '/images/clients/SUNDDAE.jpg',
          })),
        )
      }
      if (board.groups.length) {
        setGroups(
          board.groups.map((g) => ({
            id: g.id,
            title: g.title,
            color: g.color || 'text-[#6c7ff5]',
            collapsed: false,
            dateRange: '',
            items: board.tasks
              .filter((t) => t.group_id === g.id)
              .map((t) => {
                const assignee = board.members.find((m) => m.id === t.assignee_id)
                return {
                  id: t.id,
                  title: t.title,
                  hasChevron: true,
                  description: t.description ?? undefined,
                  personAvatars: assignee?.avatar_url ? [assignee.avatar_url] : [],
                  personNames: assignee ? [assignee.name] : [],
                  status: board.statuses.find((s) => s.id === t.status_id)?.label ?? 'To Do',
                  date: fromISODate(t.due_date),
                  checked: t.checked,
                  expanded: false,
                  subtasks: board.subtasks
                    .filter((s) => s.task_id === t.id)
                    .map((s) => ({ id: s.id, text: s.text, done: s.done })),
                  attachments: board.attachments
                    .filter((a) => a.task_id === t.id)
                    .map((a) => ({ id: a.id, name: a.name })),
                  comments: board.comments
                    .filter((c) => c.task_id === t.id && !c.parent_id)
                    .map((c) => ({
                      id: c.id,
                      author: c.author_name,
                      text: c.body,
                      time: new Date(c.created_at).toLocaleString('en-US'),
                      avatar: c.author_avatar ?? undefined,
                      likes: c.likes,
                      replies: board.comments
                        .filter((r) => r.parent_id === c.id)
                        .map((r) => ({
                          id: r.id,
                          author: r.author_name,
                          text: r.body,
                          time: new Date(r.created_at).toLocaleString('en-US'),
                          avatar: r.author_avatar ?? undefined,
                        })),
                    })),
                }
              }),
          })),
        )
      }
      if (board.docBlocks.length) {
        setDocBlocks(board.docBlocks as DocBlock[])
        setHistory([board.docBlocks as DocBlock[]])
        setHistoryIndex(0)
      }
    })().catch(() => {})
    return () => {
      alive = false
    }
  }, [rawScope, rawCard])

  // Terjemahkan label status UI -> id kolom `statuses` di DB.
  const statusIdByLabel = (label: string) => statusList.find((s) => s.label === label)?.id ?? null
  const refreshMembers = async () => {
    if (!projectId) return
    const board = await loadBoard(projectId)
    setMembers(
      board.members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        avatar: m.avatar_url || '/images/clients/SUNDDAE.jpg',
      })),
    )
  }

  // Manage Labels Modal
  const [showManageLabels, setShowManageLabels] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(COLOR_PALETTE[0])
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)

  // ======================== MAIN TABLE FILTER & SORT STATES ========================
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [personFilter, setPersonFilter] = useState<string>('all')
  const [showPersonFilterMenu, setShowPersonFilterMenu] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showStatusFilterMenu, setShowStatusFilterMenu] = useState(false)
  const [sortOption, setSortOption] = useState<'none' | 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'>('none')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showMoreTableMenu, setShowMoreTableMenu] = useState(false)

  // Floating Status Picker state (Which row opened it)
  const [activeStatusPicker, setActiveStatusPicker] = useState<{
    groupId: string
    taskId: string
  } | null>(null)

  // Row Assignee Picker state
  const [activeAssigneePicker, setActiveAssigneePicker] = useState<{
    groupId: string
    taskId: string
  } | null>(null)

  // Row Date Picker state
  const [activeDatePicker, setActiveDatePicker] = useState<{
    groupId: string
    taskId: string
  } | null>(null)

  // New Item Dialog modal
  const [showNewItemModal, setShowNewItemModal] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('New Item')
  const [newTaskGroup, setNewTaskGroup] = useState<string>('group-1')
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('')
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('')
  const [newTaskDate, setNewTaskDate] = useState<string>('Feb 4, 12:00 AM')

  // Modal Popover dropdown states (matching slides)
  const [showGroupDropdown, setShowGroupDropdown] = useState(false)
  const [showPersonDropdown, setShowPersonDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [datePickerMonth, setDatePickerMonth] = useState(2) // March
  const [datePickerYear, setDatePickerYear] = useState(2026)
  const [datePickerDay, setDatePickerDay] = useState(17)
  const [datePickerTime, setDatePickerTime] = useState('12:00 AM')
  const [searchGroupQuery, setSearchGroupQuery] = useState('')
  const [searchPersonQuery, setSearchPersonQuery] = useState('')
  const [showInlineAddLabel, setShowInlineAddLabel] = useState(false)
  const [inlineLabelName, setInlineLabelName] = useState('')
  const [inlineLabelColor, setInlineLabelColor] = useState('#f59e0b')

  // Add column modal
  const [showAddColumnMenu, setShowAddColumnMenu] = useState(false)
  const [extraColumns, setExtraColumns] = useState<string[]>([])

  // ======================== TASK DETAIL MODAL (klik task) ========================
  const [detailTask, setDetailTask] = useState<{ groupId: string; taskId: string } | null>(null)
  const [detailStatusOpen, setDetailStatusOpen] = useState(false)
  const [detailPersonOpen, setDetailPersonOpen] = useState(false)
  const [detailDateOpen, setDetailDateOpen] = useState(false)
  const [detailMaximized, setDetailMaximized] = useState(false)
  const [detailSubtaskInput, setDetailSubtaskInput] = useState('')
  const [detailComment, setDetailComment] = useState('')
  const [detailShowSubtasks, setDetailShowSubtasks] = useState(true)
  const [detailShowAttach, setDetailShowAttach] = useState(true)
  const [detailReplyTo, setDetailReplyTo] = useState<string | null>(null)
  const [detailReplyText, setDetailReplyText] = useState('')
  const [commentSearch, setCommentSearch] = useState('')
  const [showCommentSearch, setShowCommentSearch] = useState(false)

  const openTaskDetail = (groupId: string, taskId: string) => {
    setDetailTask({ groupId, taskId })
    setDetailStatusOpen(false)
    setDetailPersonOpen(false)
    setDetailDateOpen(false)
    setDetailMaximized(false)
    setDetailSubtaskInput('')
    setDetailComment('')
  }

  const closeTaskDetail = () => {
    setDetailTask(null)
    setDetailStatusOpen(false)
    setDetailPersonOpen(false)
    setDetailDateOpen(false)
  }

  // ======================== DOC TAB STATE & HISTORY ========================
  const [docBlocks, setDocBlocks] = useState<DocBlock[]>(initialDocBlocks)
  const [history, setHistory] = useState<DocBlock[][]>([initialDocBlocks])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [activeBlockId, setActiveBlockId] = useState<string>('block-1')
  const [lastUpdated, setLastUpdated] = useState('Apr 13, 2026, 22:43')

  // Simpan isi tab Doc ke Supabase (debounce 800ms).
  useEffect(() => {
    if (!projectId) return
    const t = setTimeout(() => {
      saveDoc(projectId, docBlocks).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [projectId, docBlocks])

  // Doc toolbars dropdown states
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showTextStyleDropdown, setShowTextStyleDropdown] = useState(false)
  const [showAlignMenu, setShowAlignMenu] = useState(false)
  const [showStyleMenu, setShowStyleMenu] = useState(false)
  const [showMentionMenu, setShowMentionMenu] = useState(false)

  // ======================== STATUS LABEL MANAGEMENT ========================

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) return
    const label = newLabelName.trim()
    let id = `custom-${Date.now()}`
    if (projectId) {
      const row = await createStatus(projectId, label, newLabelColor, statusList.length).catch(
        () => null,
      )
      if (row) id = row.id
    }
    setStatusList((prev) => [...prev, { id, label, colorCode: newLabelColor }])
    setNewLabelName('')
    setNewLabelColor(COLOR_PALETTE[0])
  }

  const handleDeleteLabel = (id: string) => {
    if (projectId) deleteStatus(id).catch(() => {})
    setStatusList((prev) => prev.filter((s) => s.id !== id))
  }

  const handleUpdateLabelColor = (id: string, colorCode: string) => {
    if (projectId) updateStatusColor(id, colorCode).catch(() => {})
    setStatusList((prev) => prev.map((s) => (s.id === id ? { ...s, colorCode } : s)))
  }

  // ======================== MAIN TABLE FUNCTIONS ========================

  // Select a status from the ordered dropdown list
  const setTaskStatus = (groupId: string, taskId: string, newStatus: TaskStatus) => {
    if (projectId) {
      updateTaskRow(taskId, { status_id: statusIdByLabel(newStatus) }).catch(() => {})
    }
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
        }
      })
    )
    setActiveStatusPicker(null)
  }

  // ======================== KANBAN DRAG & DROP ========================
  // Pindahkan tugas antar kolom Kanban (native HTML5 drag & drop).
  const handleMoveTask = (taskId: string, groupId: string, newStatus: string) => {
    if (projectId) {
      updateTaskRow(taskId, { status_id: statusIdByLabel(newStatus) }).catch(() => {})
    }
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, items: g.items.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)) }
          : g
      )
    )
  }

  // Buka modal New Item dengan status kolom yang ditekan.
  const handleAddTaskInStatus = (statusLabel: string) => {
    setNewTaskStatus(statusLabel)
    setShowNewItemModal(true)
  }

  // Toggle assignee membership on a task
  const toggleTaskAssignee = (groupId: string, taskId: string, member: (typeof members)[0]) => {
    if (projectId) {
      const current = groups.find((g) => g.id === groupId)?.items.find((t) => t.id === taskId)
      const exists = (current?.personNames || []).includes(member.name)
      updateTaskRow(taskId, { assignee_id: exists ? null : member.id }).catch(() => {})
    }
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map((t) => {
            if (t.id !== taskId) return t
            const names = t.personNames || []
            const avatars = t.personAvatars || []
            const exists = names.includes(member.name)
            let newNames: string[]
            let newAvatars: string[]
            if (exists) {
              newNames = names.filter((n) => n !== member.name)
              newAvatars = avatars.filter((a) => a !== member.avatar)
            } else {
              newNames = [...names, member.name]
              newAvatars = [...avatars, member.avatar]
            }
            return {
              ...t,
              personNames: newNames.length > 0 ? newNames : [member.name],
              personAvatars: newAvatars.length > 0 ? newAvatars : [member.avatar],
            }
          }),
        }
      })
    )
  }

  // Set task date
  const setTaskDate = (groupId: string, taskId: string, newDate: string) => {
    if (projectId) {
      updateTaskRow(taskId, { due_date: toISODate(newDate) }).catch(() => {})
    }
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map((t) => (t.id === taskId ? { ...t, date: newDate } : t)),
        }
      })
    )
    setActiveDatePicker(null)
  }

  // Toggle task checkbox
  const toggleTaskCheck = (groupId: string, taskId: string) => {
    if (projectId) {
      const current = groups.find((g) => g.id === groupId)?.items.find((t) => t.id === taskId)
      if (current) updateTaskRow(taskId, { checked: !current.checked }).catch(() => {})
    }
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map((t) => (t.id === taskId ? { ...t, checked: !t.checked } : t)),
        }
      })
    )
  }

  // Toggle all checkboxes in a group
  const toggleAllGroupTasks = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        const allChecked = g.items.every((t) => t.checked)
        return {
          ...g,
          items: g.items.map((t) => ({ ...t, checked: !allChecked })),
        }
      })
    )
  }

  // Toggle expand subpanel
  const toggleTaskExpand = (groupId: string, taskId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map((t) =>
            t.id === taskId ? { ...t, expanded: !t.expanded } : t
          ),
        }
      })
    )
  }

  // Toggle group collapse
  const toggleGroupCollapse = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))
    )
  }

  // Submit new task from modal
  const handleCreateNewTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const selectedMember = members.find((m) => m.name === newTaskAssignee)
    const statusLabel = newTaskStatus || 'To Do'
    const groupId = groups.some((g) => g.id === newTaskGroup) ? newTaskGroup : groups[0]?.id ?? null
    let id = `task-${Date.now()}`

    if (projectId) {
      const row = await createTask({
        project_id: projectId,
        group_id: groupId,
        status_id: statusIdByLabel(statusLabel),
        title: newTaskTitle.trim(),
        description: 'Tugas baru dibuat via toolbar New Item.',
        due_date: toISODate(newTaskDate),
        assignee_id: selectedMember?.id ?? null,
      }).catch(() => null)
      if (row) id = row.id
    }

    const newItem: TaskItem = {
      id,
      title: newTaskTitle.trim(),
      hasChevron: true,
      description: 'Tugas baru dibuat via toolbar New Item.',
      personAvatars: selectedMember ? [selectedMember.avatar] : [],
      personNames: selectedMember ? [selectedMember.name] : [],
      status: statusLabel,
      date: newTaskDate,
      checked: false,
      expanded: false,
    }

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return { ...g, items: [...g.items, newItem] }
      })
    )

    setNewTaskTitle('New Item')
    setShowNewItemModal(false)
    setShowGroupDropdown(false)
    setShowPersonDropdown(false)
    setShowStatusDropdown(false)
    setShowDateDropdown(false)
  }

  // Inline rename task
  const updateTaskTitle = (groupId: string, taskId: string, newTitle: string) => {
    if (projectId) updateTaskRow(taskId, { title: newTitle }).catch(() => {})
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t)),
        }
      })
    )
  }

  // Update task description from the detail modal
  const updateTaskDescription = (groupId: string, taskId: string, description: string) => {
    if (projectId) updateTaskRow(taskId, { description }).catch(() => {})
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map((t) => (t.id === taskId ? { ...t, description } : t)),
        }
      })
    )
  }

  // Generic partial update for a task (subtasks, attachments, comments)
  const updateTask = (groupId: string, taskId: string, patch: Partial<TaskItem>) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, items: g.items.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
          : g
      )
    )
  }

  // Bulk actions count
  const allTasks = groups.flatMap((g) => g.items)
  const selectedTasks = allTasks.filter((t) => t.checked)

  // Bulk delete
  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selectedTasks.length} selected tasks?`)) return
    if (projectId) deleteTasks(selectedTasks.map((t) => t.id)).catch(() => {})
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.filter((t) => !t.checked),
      }))
    )
  }

  // Bulk set status
  const handleBulkSetStatus = (status: string) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((t) => (t.checked ? { ...t, status } : t)),
      }))
    )
  }

  // Expand / collapse all groups
  const expandAllGroups = () => {
    setGroups((prev) => prev.map((g) => ({ ...g, collapsed: false })))
    setShowMoreTableMenu(false)
  }

  const collapseAllGroups = () => {
    setGroups((prev) => prev.map((g) => ({ ...g, collapsed: true })))
    setShowMoreTableMenu(false)
  }

  // Add new group
  const handleAddNewGroup = async () => {
    const groupName = prompt('Enter new group name:', 'Tugas Baru')
    if (!groupName) return
    const colors = ['text-[#6c7ff5]', 'text-[#ea384c]', 'text-[#22c55e]', 'text-[#f59e0b]', 'text-[#ec4899]']
    const color = colors[groups.length % colors.length]
    let id = `group-${Date.now()}`
    if (projectId) {
      const row = await createGroup(projectId, groupName, color, groups.length).catch(() => null)
      if (row) id = row.id
    }
    const newGroup: TaskGroup = {
      id,
      title: groupName,
      color,
      collapsed: false,
      dateRange: '',
      items: [],
    }
    setGroups([...groups, newGroup])
    setShowMoreTableMenu(false)
  }

  // Export to CSV
  const exportToCSV = () => {
    const rows = [['Group', 'Item', 'Assignees', 'Status', 'Date']]
    groups.forEach((g) => {
      g.items.forEach((item) => {
        rows.push([
          g.title,
          item.title,
          (item.personNames || ['George']).join('; '),
          item.status,
          item.date,
        ])
      })
    })
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${cardTitle.toLowerCase()}-tasks.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowMoreTableMenu(false)
  }

  // Add custom column
  const handleAddColumn = (colName: string) => {
    if (!extraColumns.includes(colName)) {
      setExtraColumns([...extraColumns, colName])
    }
    setShowAddColumnMenu(false)
  }

  // Filtered and sorted tasks for rendering
  const processedGroups = useMemo(() => {
    return groups.map((group) => {
      let items = group.items.filter((item) => {
        // Search query
        if (
          searchQuery &&
          !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false
        }
        // Person filter
        if (personFilter !== 'all') {
          const names = item.personNames || ['George']
          if (!names.includes(personFilter)) return false
        }
        // Status filter
        if (statusFilter !== 'all') {
          if (item.status !== statusFilter) return false
        }
        return true
      })

      // Sorting
      if (sortOption === 'name-asc') {
        items = [...items].sort((a, b) => a.title.localeCompare(b.title))
      } else if (sortOption === 'name-desc') {
        items = [...items].sort((a, b) => b.title.localeCompare(a.title))
      } else if (sortOption === 'date-asc') {
        items = [...items].sort((a, b) => a.date.localeCompare(b.date))
      } else if (sortOption === 'date-desc') {
        items = [...items].sort((a, b) => b.date.localeCompare(a.date))
      }

      return {
        ...group,
        items,
      }
    })
  }, [groups, searchQuery, personFilter, statusFilter, sortOption])

  // ======================== DOC TAB HELPERS ========================
  const commitBlocksChange = (newBlocks: DocBlock[]) => {
    setDocBlocks(newBlocks)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newBlocks)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setLastUpdated(`Today, ${timeStr}`)
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const handleUndo = () => {
    if (!canUndo) return
    const nextIdx = historyIndex - 1
    setHistoryIndex(nextIdx)
    setDocBlocks(history[nextIdx])
  }

  const handleRedo = () => {
    if (!canRedo) return
    const nextIdx = historyIndex + 1
    setHistoryIndex(nextIdx)
    setDocBlocks(history[nextIdx])
  }

  const activeBlock = docBlocks.find((b) => b.id === activeBlockId) || docBlocks[0]

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

  const currentTextStyle: TextStyleType =
    activeBlock?.type === 'h1'
      ? 'h1'
      : activeBlock?.type === 'h2'
      ? 'h2'
      : activeBlock?.type === 'h3'
      ? 'h3'
      : activeBlock?.type === 'quote'
      ? 'quote'
      : 'normal'

  const applyTextStyle = (style: TextStyleType) => {
    const updated = docBlocks.map((b) => {
      if (b.id !== activeBlock.id) return b
      let newType: BlockType = 'paragraph'
      if (style === 'h1') newType = 'h1'
      else if (style === 'h2') newType = 'h2'
      else if (style === 'h3') newType = 'h3'
      else if (style === 'quote') newType = 'quote'
      return { ...b, type: newType }
    })
    commitBlocksChange(updated)
    setShowTextStyleDropdown(false)
  }

  const applyAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    const updated = docBlocks.map((b) => {
      if (b.id !== activeBlock.id) return b
      return { ...b, align }
    })
    commitBlocksChange(updated)
    setShowAlignMenu(false)
  }

  const toggleStyle = (styleKey: keyof NonNullable<DocBlock['styles']>, value?: any) => {
    const updated = docBlocks.map((b) => {
      if (b.id !== activeBlock.id) return b
      const curStyles = b.styles || {}
      const nextStyles = { ...curStyles }
      if (typeof value !== 'undefined') {
        ;(nextStyles as any)[styleKey] = curStyles[styleKey] === value ? undefined : value
      } else {
        ;(nextStyles as any)[styleKey] = !curStyles[styleKey]
      }
      return { ...b, styles: nextStyles }
    })
    commitBlocksChange(updated)
  }

  const applyListType = (type: 'bullet-list' | 'numbered-list' | 'checklist') => {
    const updated = docBlocks.map((b): DocBlock => {
      if (b.id !== activeBlock.id) return b
      if (b.type === type) return { ...b, type: 'paragraph' as BlockType, items: undefined }
      const existingItems =
        b.items ||
        (b.content
          ? b.content
              .split('\n')
              .filter(Boolean)
              .map((txt, i) => ({ id: `it-${Date.now()}-${i}`, text: txt, checked: false }))
          : [
              { id: `it-${Date.now()}-1`, text: 'Tentukan tujuan utama proyek', checked: false },
              { id: `it-${Date.now()}-2`, text: 'Rancang wireframe & prototype awal', checked: false },
            ])
      return { ...b, type, items: existingItems }
    })
    commitBlocksChange(updated)
  }

  const insertMention = (member: (typeof members)[0]) => {
    const updated = docBlocks.map((b) => {
      if (b.id !== activeBlock.id) return b
      return { ...b, content: (b.content || '') + ` @${member.name} ` }
    })
    commitBlocksChange(updated)
    setShowMentionMenu(false)
  }

  const insertNewBlock = (type: BlockType) => {
    let newBlock: DocBlock
    const id = `block-${Date.now()}`
    switch (type) {
      case 'h1':
        newBlock = { id, type: 'h1', content: 'Judul Baru', align: 'left', styles: {} }
        break
      case 'h2':
        newBlock = { id, type: 'h2', content: 'Subjudul Baru', align: 'left', styles: {} }
        break
      case 'h3':
        newBlock = { id, type: 'h3', content: 'Heading Bagian', align: 'left', styles: {} }
        break
      case 'quote':
        newBlock = {
          id,
          type: 'quote',
          content: 'Kutipan penting atau instruksi langsung dari klien.',
          align: 'left',
          styles: {},
        }
        break
      case 'bullet-list':
        newBlock = {
          id,
          type: 'bullet-list',
          content: '',
          items: [
            { id: `it-${Date.now()}-1`, text: 'Item daftar pertama' },
            { id: `it-${Date.now()}-2`, text: 'Item daftar kedua' },
          ],
        }
        break
      case 'numbered-list':
        newBlock = {
          id,
          type: 'numbered-list',
          content: '',
          items: [
            { id: `it-${Date.now()}-1`, text: 'Langkah pertama dalam brief' },
            { id: `it-${Date.now()}-2`, text: 'Langkah kedua implementasi' },
          ],
        }
        break
      case 'checklist':
        newBlock = {
          id,
          type: 'checklist',
          content: '',
          items: [
            { id: `it-${Date.now()}-1`, text: 'Briefing awal dengan klien', checked: true },
            { id: `it-${Date.now()}-2`, text: 'Penyusunan aset visual brand', checked: false },
          ],
        }
        break
      case 'file':
        newBlock = {
          id,
          type: 'file',
          content: '',
          fileData: {
            name: 'Dokumen-Spesifikasi-Project.docx',
            size: '312 KB',
            icon: 'W',
          },
        }
        break
      case 'image':
        newBlock = {
          id,
          type: 'image',
          content: 'Visual mockup referensi proyek',
          imageUrl:
            'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&auto=format&fit=crop&q=80',
        }
        break
      case 'divider':
        newBlock = { id, type: 'divider', content: '' }
        break
      case 'paragraph':
      default:
        newBlock = {
          id,
          type: 'paragraph',
          content: 'Tulis paragraf baru di sini...',
          align: 'left',
          styles: {},
        }
        break
    }
    commitBlocksChange([...docBlocks, newBlock])
    setActiveBlockId(newBlock.id)
    setShowAddMenu(false)
  }

  const deleteBlock = (blockId: string) => {
    if (docBlocks.length <= 1) {
      alert('Dokumen minimal memiliki satu blok konten.')
      return
    }
    const updated = docBlocks.filter((b) => b.id !== blockId)
    commitBlocksChange(updated)
    if (activeBlockId === blockId) setActiveBlockId(updated[0]?.id || '')
  }

  const updateBlockContent = (blockId: string, content: string) => {
    const updated = docBlocks.map((b) => (b.id === blockId ? { ...b, content } : b))
    commitBlocksChange(updated)
  }

  const updateListItem = (blockId: string, itemId: string, text: string) => {
    const updated = docBlocks.map((b) => {
      if (b.id !== blockId || !b.items) return b
      return {
        ...b,
        items: b.items.map((it) => (it.id === itemId ? { ...it, text } : it)),
      }
    })
    commitBlocksChange(updated)
  }

  const toggleChecklistItem = (blockId: string, itemId: string) => {
    const updated = docBlocks.map((b) => {
      if (b.id !== blockId || !b.items) return b
      return {
        ...b,
        items: b.items.map((it) => (it.id === itemId ? { ...it, checked: !it.checked } : it)),
      }
    })
    commitBlocksChange(updated)
  }

  const addListItem = (blockId: string) => {
    const updated = docBlocks.map((b) => {
      if (b.id !== blockId) return b
      const items = b.items || []
      return {
        ...b,
        items: [...items, { id: `it-${Date.now()}`, text: 'Item baru...', checked: false }],
      }
    })
    commitBlocksChange(updated)
  }

  const getBlockStyleClasses = (block: DocBlock) => {
    const classes: string[] = []
    switch (block.type) {
      case 'h1':
        classes.push('text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug')
        break
      case 'h2':
        classes.push('text-xl sm:text-2xl font-bold text-white tracking-normal leading-snug')
        break
      case 'h3':
        classes.push('text-base sm:text-lg font-semibold text-neutral-200 leading-normal')
        break
      case 'quote':
        classes.push(
          'text-sm sm:text-base italic text-neutral-300 pl-4 py-2.5 border-l-4 border-blue-500 bg-[#16171b]/80 rounded-r-lg leading-relaxed shadow-sm'
        )
        break
      default:
        classes.push('text-sm text-neutral-300 leading-relaxed font-normal')
        break
    }
    if (block.align === 'center') classes.push('text-center')
    else if (block.align === 'right') classes.push('text-right')
    else if (block.align === 'justify') classes.push('text-justify')
    else classes.push('text-left')

    if (block.styles?.bold) classes.push('font-bold')
    if (block.styles?.italic) classes.push('italic')
    if (block.styles?.underline) classes.push('underline underline-offset-4')
    if (block.styles?.strikethrough) classes.push('line-through')
    if (block.styles?.color) classes.push(block.styles.color)
    if (block.styles?.bg) classes.push(`${block.styles.bg} px-1.5 py-0.5 rounded`)

    return classes.join(' ')
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
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => setShowWorkspaceMenu((v) => !v)}
                    className="w-full flex items-center justify-between bg-[#191a1e] border border-neutral-700/80 rounded-xl px-3 py-2 text-sm cursor-pointer hover:border-neutral-600 transition"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="w-5 h-5 rounded bg-fuchsia-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        I
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {selectedWorkspace}
                      </span>
                    </div>
                    <ChevronDown size={15} className="text-neutral-400 shrink-0" />
                  </button>

                  {showWorkspaceMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowWorkspaceMenu(false)} />
                      <div className="absolute left-0 top-full mt-1.5 z-30 w-[286px] bg-[#191a1e] border border-neutral-700/80 rounded-xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-100">
                        {/* Search */}
                        <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-neutral-700 bg-[#111214]">
                          <Search size={15} className="text-neutral-400 shrink-0" />
                          <input
                            type="text"
                            autoFocus
                            value={workspaceSearch}
                            onChange={(e) => setWorkspaceSearch(e.target.value)}
                            placeholder="Search for a workspace"
                            className="bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none w-full"
                          />
                        </div>

                        {/* Recent workspace */}
                        <p className="text-xs font-semibold text-neutral-300 mt-3 mb-1 px-1">
                          Recent workspace
                        </p>
                        <div className="space-y-0.5 max-h-56 overflow-y-auto">
                          {workspaces
                            .filter((ws) =>
                              ws.name.toLowerCase().includes(workspaceSearch.toLowerCase())
                            )
                            .map((ws) => (
                              <button
                                key={ws.id}
                                type="button"
                                onClick={() => {
                                  setSelectedWorkspace(ws.name)
                                  setShowWorkspaceMenu(false)
                                  setWorkspaceSearch('')
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                                  ws.name === selectedWorkspace
                                    ? 'bg-blue-600 text-white font-semibold'
                                    : 'text-neutral-200 hover:bg-neutral-800'
                                }`}
                              >
                                {ws.name}
                              </button>
                            ))}
                          {workspaces.filter((ws) =>
                            ws.name.toLowerCase().includes(workspaceSearch.toLowerCase())
                          ).length === 0 && (
                            <p className="px-3 py-2 text-xs text-neutral-500">
                              Workspace tidak ditemukan.
                            </p>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-neutral-800">
                          <button
                            type="button"
                            onClick={() => {
                              setShowWorkspaceMenu(false)
                              setNewWorkspaceName('')
                              setShowAddWorkspaceModal(true)
                            }}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Add Workspace</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowWorkspaceMenu(false)}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <LayoutGrid size={13} />
                            <span>Browse All</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewWorkspaceName('')
                    setShowAddWorkspaceModal(true)
                  }}
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
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto bg-[#0d0e11] relative">
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

                {/* Kanban Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('Kanban')}
                  className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                    activeTab === 'Kanban'
                      ? 'border-white text-white font-semibold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>Kanban</span>
                  {activeTab === 'Kanban' && (
                    <MoreHorizontal size={14} className="text-neutral-500" />
                  )}
                </button>

                {/* Custom view tabs */}
                {customViews.map((cv) => (
                  <button
                    key={cv.id}
                    type="button"
                    onClick={() => setActiveTab(cv.name)}
                    className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition cursor-pointer ${
                      activeTab === cv.name
                        ? 'border-white text-white font-semibold'
                        : 'border-transparent text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <span>{cv.name}</span>
                    {activeTab === cv.name && (
                      <MoreHorizontal size={14} className="text-neutral-500" />
                    )}
                  </button>
                ))}

                {/* Add Tab */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAddViewMenu((v) => !v)}
                    className="pb-3 text-neutral-400 hover:text-white transition cursor-pointer p-0.5"
                    aria-label="Add tab"
                  >
                    <Plus size={16} />
                  </button>
                  {showAddViewMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowAddViewMenu(false)} />
                      <div className="absolute left-0 top-full mt-1 w-48 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
                          Add View
                        </div>
                        {([
                          { name: 'Gantt', type: 'gantt' as const },
                          { name: 'Chart', type: 'chart' as const },
                        ] as const).map((opt) => (
                          <button
                            key={opt.name}
                            type="button"
                            onClick={() => {
                              if (customViews.some((v) => v.name === opt.name)) {
                                setActiveTab(opt.name)
                              } else {
                                setCustomViews((prev) => [
                                  ...prev,
                                  { id: `view-${Date.now()}`, name: opt.name, type: opt.type },
                                ])
                                setActiveTab(opt.name)
                              }
                              setShowAddViewMenu(false)
                            }}
                            className="w-full px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 rounded transition cursor-pointer text-left"
                          >
                            + {opt.name} view
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* TAB: KANBAN BOARD */}
            {activeTab === 'Kanban' && (
              <KanbanView
                groups={processedGroups}
                statusList={statusList}
                onMoveTask={handleMoveTask}
                onAddTask={handleAddTaskInStatus}
                onOpenTask={openTaskDetail}
              />
            )}

            {/* TAB 1: MAIN TABLE */}
            {activeTab === 'Main Table' && (
              <>
                {/* Action Toolbar for Main Table */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {/* + New item button with split options */}
                  <div className="inline-flex rounded-md shadow-sm">
                    <button
                      type="button"
                      onClick={() => setShowNewItemModal(true)}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-l-md transition cursor-pointer"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      <span>New item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewItemModal(true)}
                      className="inline-flex items-center px-1.5 h-8 bg-blue-600 hover:bg-blue-500 border-l border-blue-700 active:scale-95 text-white text-xs rounded-r-md transition cursor-pointer"
                      aria-label="More new item options"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Search Input / Toggle */}
                  <div className="relative">
                    {showSearchInput ? (
                      <div className="relative flex items-center">
                        <Search
                          size={14}
                          className="absolute left-2.5 text-neutral-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search tasks..."
                          autoFocus
                          className="h-8 pl-8 pr-7 bg-[#191a1e] border border-blue-500/70 rounded-md text-xs text-white placeholder:text-neutral-500 focus:outline-none w-48 sm:w-60 transition"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 text-neutral-400 hover:text-white"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSearchInput(true)}
                        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs transition cursor-pointer ${
                          searchQuery
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                        }`}
                      >
                        <Search size={14} />
                        <span>{searchQuery ? `"${searchQuery}"` : 'Search'}</span>
                      </button>
                    )}
                  </div>

                  {/* Person Filter Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPersonFilterMenu(!showPersonFilterMenu)}
                      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs transition cursor-pointer ${
                        personFilter !== 'all'
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                      }`}
                    >
                      <UserIcon size={14} />
                      <span>{personFilter === 'all' ? 'Person' : personFilter}</span>
                      <ChevronDown size={12} className="text-neutral-400" />
                    </button>

                    {showPersonFilterMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowPersonFilterMenu(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-52 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
                            Filter by Assignee
                          </div>
                          <div className="space-y-0.5 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPersonFilter('all')
                                setShowPersonFilterMenu(false)
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                                personFilter === 'all'
                                  ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                  : 'text-neutral-300 hover:bg-neutral-800'
                              }`}
                            >
                              <span>All Members</span>
                              {personFilter === 'all' && <Check size={14} />}
                            </button>
                            {members.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setPersonFilter(m.name)
                                  setShowPersonFilterMenu(false)
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                                  personFilter === m.name
                                    ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                    : 'text-neutral-300 hover:bg-neutral-800'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full overflow-hidden border border-neutral-700 shrink-0">
                                    <Image
                                      src={m.avatar}
                                      alt={m.name}
                                      width={20}
                                      height={20}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span>{m.name}</span>
                                </div>
                                {personFilter === m.name && <Check size={14} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status Filter Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStatusFilterMenu(!showStatusFilterMenu)}
                      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs transition cursor-pointer ${
                        statusFilter !== 'all'
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                      }`}
                    >
                      <Filter size={14} />
                      <span>{statusFilter === 'all' ? 'Filter' : statusFilter}</span>
                      <ChevronDown size={12} className="text-neutral-400" />
                    </button>

                    {showStatusFilterMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowStatusFilterMenu(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-48 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
                            Filter by Status
                          </div>
                          <div className="space-y-0.5 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setStatusFilter('all')
                                setShowStatusFilterMenu(false)
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                                statusFilter === 'all'
                                  ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                  : 'text-neutral-300 hover:bg-neutral-800'
                              }`}
                            >
                              <span>All Statuses</span>
                              {statusFilter === 'all' && <Check size={14} />}
                            </button>
                            {statusList.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setStatusFilter(s.label)
                                  setShowStatusFilterMenu(false)
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                                  statusFilter === s.label
                                    ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                    : 'text-neutral-300 hover:bg-neutral-800'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: s.colorCode }}
                                  />
                                  <span>{s.label}</span>
                                </div>
                                {statusFilter === s.label && <Check size={14} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs transition cursor-pointer ${
                        sortOption !== 'none'
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                      }`}
                    >
                      <ArrowUpDown size={14} />
                      <span>Sort</span>
                    </button>

                    {showSortMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowSortMenu(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-48 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
                            Sort By
                          </div>
                          <div className="space-y-0.5 mt-1">
                            {[
                              { id: 'none', label: 'Default Order' },
                              { id: 'name-asc', label: 'Name (A to Z)' },
                              { id: 'name-desc', label: 'Name (Z to A)' },
                              { id: 'date-asc', label: 'Date (Earliest)' },
                              { id: 'date-desc', label: 'Date (Latest)' },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setSortOption(opt.id as any)
                                  setShowSortMenu(false)
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                                  sortOption === opt.id
                                    ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                    : 'text-neutral-300 hover:bg-neutral-800'
                                }`}
                              >
                                <span>{opt.label}</span>
                                {sortOption === opt.id && <Check size={14} />}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* More Table Options Menu */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMoreTableMenu(!showMoreTableMenu)}
                      className="inline-flex items-center justify-center h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-md text-xs transition cursor-pointer"
                      aria-label="More actions"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {showMoreTableMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowMoreTableMenu(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-52 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={expandAllGroups}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <ChevronDown size={14} />
                            <span>Expand All Groups</span>
                          </button>
                          <button
                            type="button"
                            onClick={collapseAllGroups}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <ChevronRight size={14} />
                            <span>Collapse All Groups</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAddNewGroup}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Add New Group</span>
                          </button>
                          <div className="w-full h-px bg-neutral-800 my-1" />
                          <button
                            type="button"
                            onClick={exportToCSV}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                          >
                            <Download size={14} />
                            <span>Export Table to CSV</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Reset Filters button if active */}
                  {(personFilter !== 'all' || statusFilter !== 'all' || sortOption !== 'none' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPersonFilter('all')
                        setStatusFilter('all')
                        setSortOption('none')
                        setSearchQuery('')
                        setShowSearchInput(false)
                      }}
                      className="text-xs text-neutral-400 hover:text-blue-400 transition cursor-pointer underline ml-auto"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>

                {/* Bulk Actions Floating Bar (when tasks are checked) */}
                {selectedTasks.length > 0 && (
                  <div className="mb-4 p-2.5 px-4 bg-[#1b1d22] border border-blue-500/50 rounded-xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[11px]">
                        {selectedTasks.length}
                      </span>
                      <span>Tasks selected</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-neutral-400 mr-1">Set Status:</span>
                      {statusList.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleBulkSetStatus(s.label)}
                          style={{ backgroundColor: s.colorCode, color: getContrastText(s.colorCode) }}
                          className="px-2 py-1 text-[11px] font-semibold rounded hover:brightness-105 transition"
                        >
                          {s.label}
                        </button>
                      ))}

                      <div className="w-px h-4 bg-neutral-700 mx-2" />

                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-rose-900/60 text-rose-300 text-xs rounded transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Task Groups Table Container */}
                <div className="space-y-8 flex-1">
                  {processedGroups.map((group) => {
                    const totalItems = group.items.length || 1
                    // Dynamic progress bar: compute per-status counts
                    const statusCounts = statusList.map((s) => ({
                      ...s,
                      count: group.items.filter((i) => i.status === s.label).length,
                    }))

                    // Keep legacy variables for tooltip
                    const inQueueCount = group.items.filter((i) => i.status === 'In Queue').length
                    const workingCount = group.items.filter((i) => i.status === 'Working on it').length
                    const doneCount = group.items.filter((i) => i.status === 'Done').length
                    const stuckCount = group.items.filter((i) => i.status === 'Stuck').length

                    const inQueuePct = (inQueueCount / totalItems) * 100
                    const workingPct = (workingCount / totalItems) * 100
                    const donePct = (doneCount / totalItems) * 100
                    const stuckPct = (stuckCount / totalItems) * 100

                    const allGroupChecked =
                      group.items.length > 0 && group.items.every((i) => i.checked)

                    return (
                      <div key={group.id} className="space-y-2">
                        {/* Group Header Title */}
                        <div
                          onClick={() => toggleGroupCollapse(group.id)}
                          className="flex items-center gap-2 cursor-pointer select-none py-1 group/header w-fit"
                        >
                          {group.collapsed ? (
                            <ChevronUp
                              size={16}
                              className={`${group.color} transition-transform`}
                            />
                          ) : (
                            <ChevronDown
                              size={16}
                              className={`${group.color} transition-transform`}
                            />
                          )}
                          <span className={`text-sm font-semibold tracking-wide ${group.color}`}>
                            {group.title}
                          </span>
                          <span className="text-[11px] text-neutral-500 font-normal ml-1">
                            ({group.items.length})
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
                                    <button
                                      type="button"
                                      onClick={() => toggleAllGroupTasks(group.id)}
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer mx-auto ${
                                        allGroupChecked
                                          ? 'bg-blue-600 border-blue-500 text-white'
                                          : 'border-neutral-600 hover:border-neutral-400'
                                      }`}
                                      title={allGroupChecked ? 'Deselect all' : 'Select all'}
                                    >
                                      {allGroupChecked && <Check size={12} strokeWidth={3} />}
                                    </button>
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
                                  {extraColumns.map((col) => (
                                    <th
                                      key={col}
                                      className="w-36 px-4 py-2 border-r border-neutral-800/80 font-normal text-center"
                                    >
                                      {col}
                                    </th>
                                  ))}
                                  {/* Add Column Button */}
                                  <th className="w-12 px-2 py-2 text-center relative">
                                    <button
                                      type="button"
                                      onClick={() => setShowAddColumnMenu(!showAddColumnMenu)}
                                      className="p-1 hover:text-white rounded transition cursor-pointer"
                                      title="Add column"
                                    >
                                      <Plus size={14} className="mx-auto text-neutral-400" />
                                    </button>

                                    {showAddColumnMenu && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-20"
                                          onClick={() => setShowAddColumnMenu(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                                          <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
                                            Add Column
                                          </div>
                                          {['Priority', 'Timeline', 'Files', 'Notes'].map((col) => (
                                            <button
                                              key={col}
                                              type="button"
                                              onClick={() => handleAddColumn(col)}
                                              className="w-full px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 rounded transition cursor-pointer text-left"
                                            >
                                              + {col}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </th>
                                </tr>
                              </thead>

                              {/* Table Body */}
                              <tbody>
                                {group.items.map((item) => {
                                  const currentStatusDef =
                                    statusList.find((s) => s.label === item.status) || statusList[statusList.length - 1] || { colorCode: '#64748b', label: item.status }
                                  const isStatusPickerOpen =
                                    activeStatusPicker?.groupId === group.id &&
                                    activeStatusPicker?.taskId === item.id
                                  const isAssigneePickerOpen =
                                    activeAssigneePicker?.groupId === group.id &&
                                    activeAssigneePicker?.taskId === item.id
                                  const isDatePickerOpen =
                                    activeDatePicker?.groupId === group.id &&
                                    activeDatePicker?.taskId === item.id

                                  return (
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

                                      {/* Item Name (klik = detail) */}
                                      <td className="px-4 py-2.5 border-r border-neutral-800/80">
                                        <div
                                          className="flex items-center gap-2 cursor-pointer"
                                          onClick={() => openTaskDetail(group.id, item.id)}
                                        >
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              toggleTaskExpand(group.id, item.id)
                                            }}
                                            className="text-neutral-500 hover:text-neutral-300 transition cursor-pointer p-0.5"
                                            title="Expand task details"
                                          >
                                            <ChevronRight
                                              size={14}
                                              className={`transition-transform duration-200 ${
                                                item.expanded ? 'rotate-90 text-blue-400' : ''
                                              }`}
                                            />
                                          </button>

                                          <span
                                            className="text-xs text-neutral-200 font-medium hover:text-white hover:underline transition"
                                            title="Klik untuk buka detail"
                                          >
                                            {item.title}
                                          </span>
                                        </div>

                                        {/* Expanded sub-details */}
                                        {item.expanded && (
                                          <div className="mt-2 pl-6 text-[11px] text-neutral-400 italic border-l border-neutral-700/60 ml-1 py-1 space-y-1">
                                            <p>{item.description || 'Tidak ada deskripsi tambahan.'}</p>
                                            <p className="text-[10px] text-neutral-500">
                                              Assignees: {(item.personNames || ['George']).join(', ')}
                                            </p>
                                          </div>
                                        )}
                                      </td>

                                      {/* Person Avatars (Interactive Assignee Picker) */}
                                      <td className="px-4 py-2.5 border-r border-neutral-800/80 text-center relative">
                                        <div
                                          onClick={() =>
                                            setActiveAssigneePicker(
                                              isAssigneePickerOpen
                                                ? null
                                                : { groupId: group.id, taskId: item.id }
                                            )
                                          }
                                          className="flex items-center justify-center -space-x-1.5 cursor-pointer hover:opacity-80 transition"
                                          title="Click to change assignee"
                                        >
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

                                        {/* Assignee Popover */}
                                        {isAssigneePickerOpen && (
                                          <>
                                            <div
                                              className="fixed inset-0 z-20"
                                              onClick={() => setActiveAssigneePicker(null)}
                                            />
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-56 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                                              <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80 mb-1">
                                                Assign Members
                                              </div>
                                              <div className="space-y-1">
                                                {members.map((m) => {
                                                  const isAssigned = (item.personNames || []).includes(
                                                    m.name
                                                  )
                                                  return (
                                                    <button
                                                      key={m.id}
                                                      type="button"
                                                      onClick={() =>
                                                        toggleTaskAssignee(group.id, item.id, m)
                                                      }
                                                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-neutral-800 transition cursor-pointer text-left"
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full overflow-hidden border border-neutral-700 shrink-0">
                                                          <Image
                                                            src={m.avatar}
                                                            alt={m.name}
                                                            width={20}
                                                            height={20}
                                                            className="w-full h-full object-cover"
                                                          />
                                                        </div>
                                                        <span className="text-neutral-200 text-xs">
                                                          {m.name}
                                                        </span>
                                                      </div>
                                                      <div
                                                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                          isAssigned
                                                            ? 'bg-blue-600 border-blue-500 text-white'
                                                            : 'border-neutral-600'
                                                        }`}
                                                      >
                                                        {isAssigned && (
                                                          <Check size={11} strokeWidth={3} />
                                                        )}
                                                      </div>
                                                    </button>
                                                  )
                                                })}
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </td>

                                      {/* Status Badge with ORDERED STATUS DROPDOWN PICKER */}
                                      <td className="p-0 border-r border-neutral-800/80 relative">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setActiveStatusPicker(
                                              isStatusPickerOpen
                                                ? null
                                                : { groupId: group.id, taskId: item.id }
                                            )
                                          }
                                          title="Click to select status"
                                          style={{
                                            backgroundColor: currentStatusDef.colorCode,
                                            color: getContrastText(currentStatusDef.colorCode),
                                          }}
                                          className="w-full h-full py-2.5 px-3 text-center text-xs tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 hover:brightness-90"
                                        >
                                          <span>{item.status}</span>
                                          <ChevronDown size={12} className="opacity-70" />
                                        </button>

                                        {/* Status Picker Popover */}
                                        {isStatusPickerOpen && (
                                          <>
                                            <div
                                              className="fixed inset-0 z-20"
                                              onClick={() => setActiveStatusPicker(null)}
                                            />
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-52 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                                              <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80 mb-1.5">
                                                Select Status
                                              </div>

                                              <div className="space-y-1">
                                                {statusList.map((st) => {
                                                  const isSelected = item.status === st.label
                                                  return (
                                                    <button
                                                      key={st.id}
                                                      type="button"
                                                      onClick={() =>
                                                        setTaskStatus(group.id, item.id, st.label)
                                                      }
                                                      style={{
                                                        backgroundColor: st.colorCode,
                                                        color: getContrastText(st.colorCode),
                                                      }}
                                                      className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-center transition cursor-pointer flex items-center justify-between shadow-sm hover:brightness-90"
                                                    >
                                                      <span>{st.label}</span>
                                                      {isSelected && (
                                                        <Check size={14} strokeWidth={2.5} />
                                                      )}
                                                    </button>
                                                  )
                                                })}
                                              </div>

                                              {/* Add New Label */}
                                              <div className="mt-2 pt-2 border-t border-neutral-800/80">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setActiveStatusPicker(null)
                                                    setShowManageLabels(true)
                                                  }}
                                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 transition cursor-pointer"
                                                >
                                                  <Plus size={13} strokeWidth={2.5} />
                                                  <span>Add New Label</span>
                                                </button>
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </td>

                                      {/* Date (Interactive Date Picker) */}
                                      <td className="px-4 py-2.5 border-r border-neutral-800/80 text-center text-xs text-neutral-300 relative">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setActiveDatePicker(
                                              isDatePickerOpen
                                                ? null
                                                : { groupId: group.id, taskId: item.id }
                                            )
                                          }
                                          className="hover:text-white hover:underline transition cursor-pointer"
                                          title="Click to change date"
                                        >
                                          {item.date}
                                        </button>

                                        {isDatePickerOpen && (
                                          <>
                                            <div
                                              className="fixed inset-0 z-20"
                                              onClick={() => setActiveDatePicker(null)}
                                            />
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-100 text-left">
                                              <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80 mb-1">
                                                Select Date
                                              </div>
                                              <div className="space-y-1">
                                                {['Mar 28, 2025', 'Mar 29, 2025', 'Mar 30, 2025', 'Apr 02, 2025'].map(
                                                  (d) => (
                                                    <button
                                                      key={d}
                                                      type="button"
                                                      onClick={() =>
                                                        setTaskDate(group.id, item.id, d)
                                                      }
                                                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-neutral-800 transition cursor-pointer ${
                                                        item.date === d
                                                          ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                                          : 'text-neutral-200'
                                                      }`}
                                                    >
                                                      <span>{d}</span>
                                                      {item.date === d && <Check size={13} />}
                                                    </button>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </td>

                                      {/* Extra Columns Values */}
                                      {extraColumns.map((col) => (
                                        <td
                                          key={col}
                                          className="px-4 py-2.5 border-r border-neutral-800/80 text-center text-xs text-neutral-400"
                                        >
                                          {col === 'Priority'
                                            ? 'Medium'
                                            : col === 'Timeline'
                                            ? '2 Days'
                                            : '-'}
                                        </td>
                                      ))}

                                      {/* Extra Column cell */}
                                      <td className="px-2 py-2.5 text-center text-neutral-600"></td>
                                    </tr>
                                  )
                                })}

                                {/* Summary / Progress Bar Footer Row */}
                                <tr className="border-b border-neutral-800/80 bg-transparent">
                                  <td className="border-r border-neutral-800/80 py-2"></td>
                                  <td className="border-r border-neutral-800/80 py-2"></td>
                                  <td className="border-r border-neutral-800/80 py-2"></td>

                                  {/* Dynamic Multi-color Progress Bar (uses dynamic statusList) */}
                                  <td className="p-1 border-r border-neutral-800/80">
                                    <div
                                      className="h-6 w-full rounded flex overflow-hidden cursor-help shadow-sm"
                                      title={statusCounts.map((s) => `${s.label}: ${s.count}`).join(', ')}
                                    >
                                      {statusCounts.map((s) => {
                                        const pct = (s.count / totalItems) * 100
                                        if (pct <= 0) return null
                                        return (
                                          <div
                                            key={s.id}
                                            style={{ width: `${pct}%`, backgroundColor: s.colorCode }}
                                            className="h-full transition-all duration-300"
                                          />
                                        )
                                      })}
                                    </div>
                                  </td>

                                  {/* Date range pill */}
                                  <td className="py-1 px-3 border-r border-neutral-800/80 text-center">
                                    <div className="inline-block px-3 py-1 bg-[#1e2025] border border-neutral-700/60 rounded text-[11px] text-neutral-300 font-normal">
                                      {group.dateRange}
                                    </div>
                                  </td>

                                  {extraColumns.map((col) => (
                                    <td
                                      key={col}
                                      className="border-r border-neutral-800/80 py-2"
                                    ></td>
                                  ))}

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
                {/* Real Docs Full Feature Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 pb-3 mb-6 border-b border-neutral-800/80 text-neutral-300 text-xs">
                  {/* + Add Element Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAddMenu(!showAddMenu)}
                      className="inline-flex items-center gap-1.5 h-7 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-md transition cursor-pointer shadow-sm mr-1"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      <span>Add</span>
                      <ChevronDown size={12} className="opacity-80" />
                    </button>

                    {showAddMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowAddMenu(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-56 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                            Insert Elements
                          </div>
                          <div className="p-1 space-y-0.5">
                            <button
                              type="button"
                              onClick={() => insertNewBlock('paragraph')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <Type size={14} className="text-neutral-400" />
                              <span>Normal Text (Paragraph)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertNewBlock('h1')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <Heading1 size={14} className="text-blue-400" />
                              <span>Heading 1 (Large Title)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertNewBlock('h2')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <Heading2 size={14} className="text-indigo-400" />
                              <span>Heading 2 (Medium Text)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertNewBlock('h3')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <Heading3 size={14} className="text-purple-400" />
                              <span>Heading 3 (Small Text)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertNewBlock('quote')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <QuoteIcon size={14} className="text-amber-400" />
                              <span>Quote Block</span>
                            </button>

                            <div className="w-full h-px bg-neutral-800 my-1" />

                            <button
                              type="button"
                              onClick={() => insertNewBlock('bullet-list')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <List size={14} className="text-neutral-400" />
                              <span>Bullet List</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertNewBlock('numbered-list')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <ListOrdered size={14} className="text-neutral-400" />
                              <span>Numbered List</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertNewBlock('checklist')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <CheckSquare size={14} className="text-emerald-400" />
                              <span>Checklist / Tasks</span>
                            </button>

                            <div className="w-full h-px bg-neutral-800 my-1" />

                            <button
                              type="button"
                              onClick={() => insertNewBlock('file')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <FileText size={14} className="text-blue-400" />
                              <span>Word Document (.docx)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertNewBlock('image')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <ImageIcon size={14} className="text-amber-400" />
                              <span>Image Reference</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => insertNewBlock('divider')}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                            >
                              <Minus size={14} className="text-neutral-500" />
                              <span>Divider Line</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Functional Undo / Redo */}
                  <div className="flex items-center gap-0.5 px-1">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className={`p-1.5 rounded transition cursor-pointer ${
                        canUndo
                          ? 'hover:text-white hover:bg-neutral-800/70 text-neutral-300'
                          : 'text-neutral-600 cursor-not-allowed'
                      }`}
                      title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}
                    >
                      <Undo2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className={`p-1.5 rounded transition cursor-pointer ${
                        canRedo
                          ? 'hover:text-white hover:bg-neutral-800/70 text-neutral-300'
                          : 'text-neutral-600 cursor-not-allowed'
                      }`}
                      title={canRedo ? 'Redo (Ctrl+Y)' : 'Nothing to redo'}
                    >
                      <Redo2 size={15} />
                    </button>
                  </div>

                  <div className="w-px h-4 bg-neutral-800 mx-1" />

                  {/* Text Style Dropdown (T, H1, H2, H3, <>) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTextStyleDropdown(!showTextStyleDropdown)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:text-white hover:bg-neutral-800/60 rounded-md transition cursor-pointer text-xs font-medium border border-transparent hover:border-neutral-700/60"
                      title="Change text size / style"
                    >
                      <span className="w-4 h-4 rounded bg-neutral-800 text-blue-400 font-bold text-[10px] flex items-center justify-center">
                        {textStyleOptions.find((o) => o.type === currentTextStyle)?.short}
                      </span>
                      <span>
                        {textStyleOptions.find((o) => o.type === currentTextStyle)?.label}
                      </span>
                      <ChevronDown size={13} className="text-neutral-500" />
                    </button>

                    {showTextStyleDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowTextStyleDropdown(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-60 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800/80">
                            Format Text Style
                          </div>
                          <div className="p-1 space-y-0.5">
                            {textStyleOptions.map((opt) => {
                              const isSelected = currentTextStyle === opt.type
                              return (
                                <button
                                  key={opt.type}
                                  type="button"
                                  onClick={() => applyTextStyle(opt.type)}
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
                                      <p className="font-medium text-xs leading-none">{opt.label}</p>
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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAlignMenu(!showAlignMenu)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer text-xs"
                      title="Text alignment"
                    >
                      {activeBlock?.align === 'center' ? (
                        <AlignCenter size={15} />
                      ) : activeBlock?.align === 'right' ? (
                        <AlignRight size={15} />
                      ) : activeBlock?.align === 'justify' ? (
                        <AlignJustify size={15} />
                      ) : (
                        <AlignLeft size={15} />
                      )}
                      <ChevronDown size={11} className="text-neutral-500" />
                    </button>

                    {showAlignMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowAlignMenu(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-36 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => applyAlignment('left')}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition cursor-pointer ${
                              activeBlock?.align === 'left' || !activeBlock?.align
                                ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                : 'text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <AlignLeft size={14} />
                            <span>Align Left</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyAlignment('center')}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition cursor-pointer ${
                              activeBlock?.align === 'center'
                                ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                : 'text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <AlignCenter size={14} />
                            <span>Center</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyAlignment('right')}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition cursor-pointer ${
                              activeBlock?.align === 'right'
                                ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                : 'text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <AlignRight size={14} />
                            <span>Align Right</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyAlignment('justify')}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition cursor-pointer ${
                              activeBlock?.align === 'justify'
                                ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                : 'text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            <AlignJustify size={14} />
                            <span>Justify</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* List Options */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => applyListType('bullet-list')}
                      className={`p-1.5 rounded transition cursor-pointer ${
                        activeBlock?.type === 'bullet-list'
                          ? 'bg-blue-600 text-white'
                          : 'hover:text-white hover:bg-neutral-800/60 text-neutral-300'
                      }`}
                      title="Bullet list"
                    >
                      <List size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyListType('numbered-list')}
                      className={`p-1.5 rounded transition cursor-pointer ${
                        activeBlock?.type === 'numbered-list'
                          ? 'bg-blue-600 text-white'
                          : 'hover:text-white hover:bg-neutral-800/60 text-neutral-300'
                      }`}
                      title="Numbered list"
                    >
                      <ListOrdered size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyListType('checklist')}
                      className={`p-1.5 rounded transition cursor-pointer ${
                        activeBlock?.type === 'checklist'
                          ? 'bg-blue-600 text-white'
                          : 'hover:text-white hover:bg-neutral-800/60 text-neutral-300'
                      }`}
                      title="Checklist / Tasks"
                    >
                      <ListTodo size={15} />
                    </button>
                  </div>

                  <div className="w-px h-4 bg-neutral-800 mx-1" />

                  {/* Style Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStyleMenu(!showStyleMenu)}
                      className={`px-2.5 py-1 rounded transition cursor-pointer text-xs font-medium flex items-center gap-1 ${
                        activeBlock?.styles?.bold ||
                        activeBlock?.styles?.italic ||
                        activeBlock?.styles?.underline ||
                        activeBlock?.styles?.color ||
                        activeBlock?.styles?.bg
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                          : 'hover:text-white hover:bg-neutral-800/60 text-neutral-300'
                      }`}
                      title="Text styling"
                    >
                      <Sparkles size={13} />
                      <span>Style</span>
                    </button>

                    {showStyleMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowStyleMenu(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-64 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-3 z-30 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                              Character Format
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleStyle('bold')}
                                className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs transition cursor-pointer border ${
                                  activeBlock?.styles?.bold
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                                }`}
                                title="Bold"
                              >
                                <Bold size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleStyle('italic')}
                                className={`w-8 h-8 rounded flex items-center justify-center italic text-xs transition cursor-pointer border ${
                                  activeBlock?.styles?.italic
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                                }`}
                                title="Italic"
                              >
                                <Italic size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleStyle('underline')}
                                className={`w-8 h-8 rounded flex items-center justify-center underline text-xs transition cursor-pointer border ${
                                  activeBlock?.styles?.underline
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                                }`}
                                title="Underline"
                              >
                                <Underline size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleStyle('strikethrough')}
                                className={`w-8 h-8 rounded flex items-center justify-center line-through text-xs transition cursor-pointer border ${
                                  activeBlock?.styles?.strikethrough
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                                }`}
                                title="Strikethrough"
                              >
                                <Strikethrough size={14} />
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                              Text Color
                            </p>
                            <div className="flex items-center gap-1.5">
                              {[
                                { label: 'Default', cls: 'text-neutral-200', bg: 'bg-neutral-200' },
                                { label: 'Blue', cls: 'text-blue-400', bg: 'bg-blue-500' },
                                { label: 'Emerald', cls: 'text-emerald-400', bg: 'bg-emerald-500' },
                                { label: 'Amber', cls: 'text-amber-400', bg: 'bg-amber-500' },
                                { label: 'Rose', cls: 'text-rose-400', bg: 'bg-rose-500' },
                                { label: 'Purple', cls: 'text-purple-400', bg: 'bg-purple-500' },
                              ].map((col) => (
                                <button
                                  key={col.label}
                                  type="button"
                                  onClick={() => toggleStyle('color', col.cls)}
                                  className={`w-6 h-6 rounded-full ${col.bg} transition-transform hover:scale-110 cursor-pointer flex items-center justify-center ring-offset-2 ring-offset-[#1a1b1f] ${
                                    activeBlock?.styles?.color === col.cls ? 'ring-2 ring-white' : ''
                                  }`}
                                  title={col.label}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                              Highlight
                            </p>
                            <div className="flex items-center gap-1.5">
                              {[
                                { label: 'None', cls: '', text: 'None' },
                                { label: 'Amber', cls: 'bg-amber-400/25', text: 'Yellow' },
                                { label: 'Blue', cls: 'bg-blue-500/25', text: 'Blue' },
                                { label: 'Emerald', cls: 'bg-emerald-500/25', text: 'Green' },
                                { label: 'Rose', cls: 'bg-rose-500/25', text: 'Red' },
                              ].map((hl) => (
                                <button
                                  key={hl.label}
                                  type="button"
                                  onClick={() => toggleStyle('bg', hl.cls)}
                                  className={`px-2 py-1 rounded text-[11px] border border-neutral-700 hover:border-neutral-500 transition cursor-pointer ${
                                    hl.cls ? hl.cls : 'bg-transparent text-neutral-400'
                                  } ${activeBlock?.styles?.bg === hl.cls ? 'ring-1 ring-white' : ''}`}
                                >
                                  {hl.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mention @ */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMentionMenu(!showMentionMenu)}
                      className="p-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer text-neutral-300"
                      title="Mention member (@)"
                    >
                      <AtSign size={15} />
                    </button>

                    {showMentionMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowMentionMenu(false)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 w-60 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                            Mention Member
                          </div>
                          <div className="p-1 space-y-0.5">
                            {members.map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => insertMention(member)}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                              >
                                <div className="w-6 h-6 rounded-full overflow-hidden border border-neutral-700 shrink-0">
                                  <Image
                                    src={member.avatar}
                                    alt={member.name}
                                    width={24}
                                    height={24}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="font-semibold text-xs leading-none truncate">
                                    {member.name}
                                  </p>
                                  <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
                                    {member.role}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Doc Content Area */}
                <div className="max-w-4xl space-y-6">
                  {/* Doc Title Heading & Metadata Header */}
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
                      Doc
                    </h1>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-400">
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

                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <span>Created</span>
                        <span className="text-neutral-200">Apr 13, 2026, 20:56</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Clock size={13} className="text-neutral-500" />
                        <span>Last updated</span>
                        <span className="text-neutral-200">{lastUpdated}</span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium ml-1">
                        <Check size={12} />
                        <span>Saved</span>
                      </span>
                    </div>
                  </div>

                  {/* Real Document Blocks Stream */}
                  <div className="space-y-4">
                    {docBlocks.map((block) => {
                      const isActive = activeBlockId === block.id

                      return (
                        <div
                          key={block.id}
                          onClick={() => setActiveBlockId(block.id)}
                          className={`group/block relative rounded-xl transition-all p-2 -mx-2 ${
                            isActive
                              ? 'ring-1 ring-blue-500/30 bg-white/[0.01]'
                              : 'hover:bg-white/[0.01]'
                          }`}
                        >
                          <div className="absolute right-2 -top-2 opacity-0 group-hover/block:opacity-100 transition-opacity flex items-center gap-1 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteBlock(block.id)
                              }}
                              className="p-1 rounded bg-neutral-800 hover:bg-rose-900/60 text-neutral-400 hover:text-rose-300 transition cursor-pointer shadow"
                              title="Delete block"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {(block.type === 'paragraph' ||
                            block.type === 'h1' ||
                            block.type === 'h2' ||
                            block.type === 'h3' ||
                            block.type === 'quote') && (
                            <div className="w-full">
                              <textarea
                                value={block.content}
                                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                rows={block.type === 'paragraph' || block.type === 'quote' ? 3 : 1}
                                className={`w-full bg-transparent resize-none border-none outline-none focus:ring-0 ${getBlockStyleClasses(
                                  block
                                )}`}
                                placeholder="Type text here..."
                              />
                            </div>
                          )}

                          {block.type === 'bullet-list' && (
                            <div className="space-y-1.5 pl-2">
                              {block.items?.map((item) => (
                                <div key={item.id} className="flex items-start gap-2.5">
                                  <span className="text-blue-400 text-lg leading-none select-none">
                                    &bull;
                                  </span>
                                  <input
                                    type="text"
                                    value={item.text}
                                    onChange={(e) =>
                                      updateListItem(block.id, item.id, e.target.value)
                                    }
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-200 focus:text-white"
                                  />
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addListItem(block.id)}
                                className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-blue-400 transition cursor-pointer pt-1"
                              >
                                <Plus size={12} />
                                <span>Add item</span>
                              </button>
                            </div>
                          )}

                          {block.type === 'numbered-list' && (
                            <div className="space-y-1.5 pl-2">
                              {block.items?.map((item, idx) => (
                                <div key={item.id} className="flex items-start gap-2.5">
                                  <span className="text-neutral-400 text-xs font-semibold select-none pt-0.5 w-4">
                                    {idx + 1}.
                                  </span>
                                  <input
                                    type="text"
                                    value={item.text}
                                    onChange={(e) =>
                                      updateListItem(block.id, item.id, e.target.value)
                                    }
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-200 focus:text-white"
                                  />
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addListItem(block.id)}
                                className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-blue-400 transition cursor-pointer pt-1"
                              >
                                <Plus size={12} />
                                <span>Add step</span>
                              </button>
                            </div>
                          )}

                          {block.type === 'checklist' && (
                            <div className="space-y-2 pl-2">
                              {block.items?.map((item) => (
                                <div key={item.id} className="flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleChecklistItem(block.id, item.id)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer ${
                                      item.checked
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'border-neutral-600 hover:border-neutral-400'
                                    }`}
                                  >
                                    {item.checked && <Check size={12} strokeWidth={3} />}
                                  </button>
                                  <input
                                    type="text"
                                    value={item.text}
                                    onChange={(e) =>
                                      updateListItem(block.id, item.id, e.target.value)
                                    }
                                    className={`flex-1 bg-transparent border-none outline-none text-sm transition ${
                                      item.checked
                                        ? 'line-through text-neutral-500'
                                        : 'text-neutral-200 focus:text-white'
                                    }`}
                                  />
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addListItem(block.id)}
                                className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-blue-400 transition cursor-pointer pt-1"
                              >
                                <Plus size={12} />
                                <span>Add checklist item</span>
                              </button>
                            </div>
                          )}

                          {block.type === 'file' && block.fileData && (
                            <div className="w-56 rounded-xl overflow-hidden border border-neutral-800 bg-[#16171b] hover:border-neutral-700 hover:shadow-lg transition-all cursor-pointer group">
                              <div className="h-28 bg-[#3b82f6] flex items-center justify-center relative group-hover:brightness-105 transition">
                                <span className="text-4xl font-extrabold text-white font-serif tracking-tighter drop-shadow-sm select-none">
                                  {block.fileData.icon}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const name = block.fileData?.name || 'dokumen.txt'
                                    const blob = new Blob(
                                      [`${name}\nUkuran: ${block.fileData?.size || '-'}\n\n(Contoh berkas dari tab Doc.)`],
                                      { type: 'text/plain' }
                                    )
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = name
                                    document.body.appendChild(a)
                                    a.click()
                                    document.body.removeChild(a)
                                    URL.revokeObjectURL(url)
                                  }}
                                  className="absolute bottom-2 right-2 p-1.5 rounded-md bg-black/30 hover:bg-black/50 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                  title="Download document"
                                >
                                  <Download size={14} />
                                </button>
                              </div>

                              <div className="px-3.5 py-2.5 bg-[#141517] border-t border-neutral-800/80">
                                <p className="text-xs text-neutral-300 font-medium truncate group-hover:text-blue-400 transition">
                                  {block.fileData.name}
                                </p>
                                <p className="text-[10px] text-neutral-500 mt-0.5">
                                  {block.fileData.size}
                                </p>
                              </div>
                            </div>
                          )}

                          {block.type === 'image' && block.imageUrl && (
                            <div className="space-y-1.5">
                              <div className="w-64 h-40 rounded-xl overflow-hidden border border-neutral-800/80 relative shadow-md group cursor-pointer hover:border-neutral-700 transition">
                                <Image
                                  src={block.imageUrl}
                                  alt={block.content || 'Image preview'}
                                  width={256}
                                  height={160}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              {block.content && (
                                <p className="text-[11px] text-neutral-500 italic pl-1">
                                  {block.content}
                                </p>
                              )}
                            </div>
                          )}

                          {block.type === 'divider' && (
                            <div className="py-2">
                              <div className="w-full h-px bg-neutral-800" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Bottom Quick-Add Prompt Bar */}
                  <div className="pt-4 border-t border-neutral-800/60">
                    <button
                      type="button"
                      onClick={() => insertNewBlock('paragraph')}
                      className="flex items-center gap-2.5 cursor-pointer text-neutral-500 hover:text-neutral-300 group py-1 select-none transition"
                    >
                      <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center group-hover:bg-blue-500 transition shadow-sm">
                        <Plus size={14} strokeWidth={2.5} />
                      </span>
                      <span className="text-xs sm:text-sm text-neutral-400 group-hover:text-neutral-200 transition">
                        Type something here to start writing
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CALENDAR VIEW */}
            {activeTab === 'Calendar' && (
              <CalendarView
                groups={groups}
                statusList={statusList}
                members={members}
                getContrastTextFn={getContrastText}
                onAddTask={(date) => {
                  try {
                    const parsed = new Date(date)
                    if (!isNaN(parsed.getTime())) {
                      setDatePickerDay(parsed.getDate())
                      setDatePickerMonth(parsed.getMonth())
                      setDatePickerYear(parsed.getFullYear())
                    }
                  } catch {}
                  setNewTaskDate(date ? `${date}, 12:00 AM` : 'Feb 4, 2026, 12:00 AM')
                  setShowNewItemModal(true)
                  setShowGroupDropdown(false)
                  setShowPersonDropdown(false)
                  setShowStatusDropdown(false)
                  setShowDateDropdown(false)
                }}
              />
            )}

            {/* CUSTOM VIEWS (Gantt / Chart) */}
            {(() => {
              const cv = customViews.find((v) => v.name === activeTab)
              if (!cv) return null
              return (
                <div className="flex-1">
                  {cv.type === 'gantt' ? (
                    <GanttView groups={groups} statusList={statusList} />
                  ) : (
                    <ChartView groups={groups} statusList={statusList} />
                  )}
                </div>
              )
            })()}
          </div>
        </main>
      </div>

      {/* ======================== NEW ITEM MODAL DIALOG (MATCHING 4 SLIDES) ======================== */}
      {showNewItemModal && (() => {
        const currentSelectedGroup = groups.find((g) => g.id === newTaskGroup) || groups[0]
        const getGroupColorHex = (g?: TaskGroup) => {
          if (!g) return '#3b82f6'
          if (g.id === 'group-1') return '#3b82f6'
          if (g.id === 'group-2') return '#ef4444'
          if (g.id === 'group-3') return '#22c55e'
          const m = g.color?.match(/#[0-9a-fA-F]+/)
          return m ? m[0] : '#3b82f6'
        }
        const filteredGroups = groups.filter((g) =>
          g.title.toLowerCase().includes(searchGroupQuery.toLowerCase())
        )
        const selectedAssigneeMember = members.find((m) => m.name === newTaskAssignee)
        const filteredMembers = members.filter((m) =>
          m.name.toLowerCase().includes(searchPersonQuery.toLowerCase())
        )

        const statusOptionsList: StatusDef[] = [
          { id: 'in_progress', label: 'In progress', colorCode: '#f59e0b' },
          { id: 'working', label: 'Working on it', colorCode: '#ea384c' },
          { id: 'default', label: 'Default label', colorCode: '#4b5563' },
          ...statusList.filter(
            (s) =>
              !['In progress', 'Working on it', 'Default label', 'In Queue', 'working', 'done'].includes(s.label)
          ),
        ]
        const selectedStatusDef =
          statusOptionsList.find((s) => s.label === newTaskStatus) ||
          statusList.find((s) => s.label === newTaskStatus) || {
            id: 'none',
            label: newTaskStatus,
            colorCode: '#4b5563',
          }

        // Date picker calendar calculation (Tanggal, Bulan, Tahun)
        const pickerFirstDay = new Date(datePickerYear, datePickerMonth, 1).getDay()
        const pickerFirstDayOffset = (pickerFirstDay + 6) % 7 // Monday-first
        const pickerDaysInMonth = new Date(datePickerYear, datePickerMonth + 1, 0).getDate()
        const pickerDaysInPrevMonth = new Date(datePickerYear, datePickerMonth, 0).getDate()

        const pickerCells: { day: number; current: boolean }[] = []
        for (let i = pickerFirstDayOffset - 1; i >= 0; i--) {
          pickerCells.push({ day: pickerDaysInPrevMonth - i, current: false })
        }
        for (let d = 1; d <= pickerDaysInMonth; d++) {
          pickerCells.push({ day: d, current: true })
        }
        const pickerRemainder = pickerCells.length % 7
        if (pickerRemainder !== 0) {
          for (let d = 1; d <= 7 - pickerRemainder; d++) {
            pickerCells.push({ day: d, current: false })
          }
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
              onClick={() => {
                setShowNewItemModal(false)
                setShowGroupDropdown(false)
                setShowPersonDropdown(false)
                setShowStatusDropdown(false)
                setShowDateDropdown(false)
              }}
            />
            <div className="relative w-full max-w-[460px] bg-[#1e2025] border border-[#343740] rounded-xl shadow-2xl z-10 p-6 animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="New Item"
                    className="text-base font-semibold text-white bg-transparent border border-white/60 focus:border-blue-500 rounded px-2.5 py-1 outline-none transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewItemModal(false)
                    setShowGroupDropdown(false)
                    setShowPersonDropdown(false)
                    setShowStatusDropdown(false)
                    setShowDateDropdown(false)
                  }}
                  className="text-neutral-400 hover:text-white transition p-1 rounded-md hover:bg-neutral-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateNewTask} className="space-y-3.5">
                {/* Row 1: Group (Slide 16:9 - 80 & 82) */}
                <div className="flex items-center gap-3 relative">
                  <div className="flex items-center gap-2 w-20 shrink-0">
                    <span className="w-5 h-5 rounded flex items-center justify-center bg-[#ea580c]/20 text-[#fb923c]">
                      <Folder size={12} />
                    </span>
                    <span className="text-xs text-neutral-300 font-medium">Group</span>
                  </div>
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowGroupDropdown(!showGroupDropdown)
                        setShowPersonDropdown(false)
                        setShowStatusDropdown(false)
                      }}
                      className="w-full h-9 px-3 rounded-md bg-[#282a32] hover:bg-[#2f323c] border border-neutral-700/60 flex items-center gap-2 cursor-pointer transition text-left"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getGroupColorHex(currentSelectedGroup) }}
                      />
                      <span className="text-xs text-neutral-200 truncate">
                        {currentSelectedGroup?.title || 'Tugas Pertama'}
                      </span>
                    </button>

                    {/* Group Dropdown Popover (Slide 82) */}
                    {showGroupDropdown && (
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-[#1e2025] border border-neutral-700 rounded-lg shadow-2xl p-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#16171b] border border-blue-500 rounded-md mb-2">
                          <Search size={13} className="text-neutral-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Search group"
                            value={searchGroupQuery}
                            onChange={(e) => setSearchGroupQuery(e.target.value)}
                            autoFocus
                            className="bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none w-full"
                          />
                        </div>
                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                          {filteredGroups.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setNewTaskGroup(g.id)
                                setShowGroupDropdown(false)
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-xs transition cursor-pointer ${
                                newTaskGroup === g.id
                                  ? 'bg-blue-600/20 text-white'
                                  : 'text-neutral-200 hover:bg-neutral-800'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: getGroupColorHex(g) }}
                              />
                              <span className="truncate">{g.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Person (Bottom-Left Slide) */}
                <div className="flex items-center gap-3 relative">
                  <div className="flex items-center gap-2 w-20 shrink-0">
                    <span className="w-5 h-5 rounded flex items-center justify-center bg-[#ca8a04]/20 text-[#facc15]">
                      <UserIcon size={12} />
                    </span>
                    <span className="text-xs text-neutral-300 font-medium">Person</span>
                  </div>
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPersonDropdown(!showPersonDropdown)
                        setShowGroupDropdown(false)
                        setShowStatusDropdown(false)
                      }}
                      className="w-full h-9 px-3 rounded-md bg-[#282a32] hover:bg-[#2f323c] border border-neutral-700/60 flex items-center justify-between cursor-pointer transition text-left"
                    >
                      {selectedAssigneeMember ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={selectedAssigneeMember.avatar}
                            alt={selectedAssigneeMember.name}
                            className="w-5 h-5 rounded-full object-cover shrink-0"
                          />
                          <span className="text-xs text-neutral-200">{selectedAssigneeMember.name}</span>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-center text-neutral-500">
                          <div className="w-5 h-5 rounded-full border border-neutral-600 flex items-center justify-center">
                            <UserIcon size={11} className="text-neutral-400" />
                          </div>
                        </div>
                      )}
                    </button>

                    {/* Person Dropdown Popover (Slide 3) */}
                    {showPersonDropdown && (
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-[#1e2025] border border-neutral-700 rounded-lg shadow-2xl p-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#16171b] border border-blue-500 rounded-md mb-2">
                          <Search size={13} className="text-neutral-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Search group"
                            value={searchPersonQuery}
                            onChange={(e) => setSearchPersonQuery(e.target.value)}
                            autoFocus
                            className="bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none w-full"
                          />
                        </div>
                        <p className="text-[11px] font-semibold text-neutral-400 px-2 py-1">Suggested Users</p>
                        <div className="space-y-0.5 max-h-44 overflow-y-auto">
                          {filteredMembers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setNewTaskAssignee(m.name)
                                setShowPersonDropdown(false)
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-left transition cursor-pointer ${
                                newTaskAssignee === m.name ? 'bg-blue-600/20' : 'hover:bg-neutral-800'
                              }`}
                            >
                              <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                              <span className="text-xs text-neutral-200">{m.name}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const email = prompt('Enter email address to invite:')
                            if (!email || !projectId) return
                            try {
                              await addMemberByEmail(projectId, email.trim())
                              await refreshMembers()
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Failed to invite member')
                            }
                            setShowPersonDropdown(false)
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 mt-1.5 border-t border-neutral-800 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
                        >
                          <Mail size={13} />
                          <span>Email an invite to a new member</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Status (Bottom-Right Slide) */}
                <div className="flex items-center gap-3 relative">
                  <div className="flex items-center gap-2 w-20 shrink-0">
                    <span className="w-5 h-5 rounded flex items-center justify-center bg-[#db2777]/20 text-[#f472b6]">
                      <Tag size={12} />
                    </span>
                    <span className="text-xs text-neutral-300 font-medium">Status</span>
                  </div>
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStatusDropdown(!showStatusDropdown)
                        setShowGroupDropdown(false)
                        setShowPersonDropdown(false)
                      }}
                      className="w-full h-9 px-3 rounded-md bg-[#282a32] hover:bg-[#2f323c] border border-neutral-700/60 flex items-center gap-2 cursor-pointer transition text-left"
                    >
                      {newTaskStatus ? (
                        <span
                          className="px-2.5 py-0.5 rounded text-xs font-semibold text-white"
                          style={{ backgroundColor: selectedStatusDef.colorCode }}
                        >
                          {newTaskStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-500"></span>
                      )}
                    </button>

                    {/* Status Dropdown Popover (Slide 4) */}
                    {showStatusDropdown && (
                      <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#1e2025] border border-neutral-700 rounded-lg shadow-2xl p-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                        <div className="space-y-1.5">
                          {statusOptionsList.map((s) => (
                            <button
                              key={s.label}
                              type="button"
                              onClick={() => setNewTaskStatus(s.label)}
                              className="w-full py-1.5 px-3 rounded text-xs font-semibold text-white text-center shadow-sm hover:brightness-110 transition cursor-pointer"
                              style={{ backgroundColor: s.colorCode }}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>

                        {/* New Label button */}
                        {showInlineAddLabel ? (
                          <div className="mt-2 pt-2 border-t border-neutral-800 space-y-2">
                            <input
                              type="text"
                              placeholder="New label name"
                              value={inlineLabelName}
                              onChange={(e) => setInlineLabelName(e.target.value)}
                              className="w-full h-7 px-2 bg-neutral-900 border border-neutral-700 rounded text-xs text-white outline-none focus:border-blue-500"
                            />
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {COLOR_PALETTE.slice(0, 6).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setInlineLabelColor(c)}
                                  className={`w-4 h-4 rounded-full transition ${
                                    inlineLabelColor === c ? 'ring-2 ring-white scale-110' : ''
                                  }`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!inlineLabelName.trim()) return
                                const label = inlineLabelName.trim()
                                let id = `custom-${Date.now()}`
                                if (projectId) {
                                  const row = await createStatus(
                                    projectId,
                                    label,
                                    inlineLabelColor,
                                    statusList.length,
                                  ).catch(() => null)
                                  if (row) id = row.id
                                }
                                const newLabel = { id, label, colorCode: inlineLabelColor }
                                setStatusList((prev) => [...prev, newLabel])
                                setNewTaskStatus(newLabel.label)
                                setInlineLabelName('')
                                setShowInlineAddLabel(false)
                              }}
                              className="w-full h-6 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowInlineAddLabel(true)}
                            className="w-full flex items-center justify-center gap-1.5 mt-2 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
                          >
                            <Plus size={12} strokeWidth={2.5} />
                            <span>New Label</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowStatusDropdown(false)}
                          className="w-full mt-2 py-1.5 bg-[#282a32] hover:bg-neutral-700 text-xs font-semibold text-neutral-200 rounded border border-neutral-700 transition cursor-pointer text-center"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: Date (Pilihan Tanggal, Bulan, Tahun) */}
                <div className="flex items-center gap-3 relative">
                  <div className="flex items-center gap-2 w-20 shrink-0">
                    <span className="w-5 h-5 rounded flex items-center justify-center bg-[#7c3aed]/20 text-[#c084fc]">
                      <CalendarIcon size={12} />
                    </span>
                    <span className="text-xs text-neutral-300 font-medium">Date</span>
                  </div>
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDateDropdown(!showDateDropdown)
                        setShowGroupDropdown(false)
                        setShowPersonDropdown(false)
                        setShowStatusDropdown(false)
                      }}
                      className="w-full h-9 px-3 rounded-md bg-[#282a32] hover:bg-[#2f323c] border border-neutral-700/60 flex items-center justify-between cursor-pointer transition text-left"
                    >
                      <span className="text-xs text-neutral-200 truncate">
                        {newTaskDate || 'Pilih tanggal, bulan & tahun'}
                      </span>
                      <CalendarIcon size={13} className="text-neutral-400 shrink-0 ml-2" />
                    </button>

                    {/* Date Picker Popover */}
                    {showDateDropdown && (
                      <div className="absolute left-0 bottom-full mb-2 w-72 bg-[#1e2025] border border-neutral-700 rounded-xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                        {/* Header: Bulan & Tahun Selectors + Navigation */}
                        <div className="flex items-center justify-between mb-3 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (datePickerMonth === 0) {
                                setDatePickerMonth(11)
                                setDatePickerYear((y) => y - 1)
                              } else {
                                setDatePickerMonth((m) => m - 1)
                              }
                            }}
                            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
                            aria-label="Previous month"
                          >
                            <ChevronLeft size={15} />
                          </button>

                          <div className="flex items-center gap-1.5">
                            {/* Pilihan Bulan (Month) */}
                            <select
                              value={datePickerMonth}
                              onChange={(e) => setDatePickerMonth(Number(e.target.value))}
                              className="bg-[#282a32] text-xs font-semibold text-neutral-200 border border-neutral-700 rounded px-2 py-1 outline-none cursor-pointer hover:border-neutral-500 transition"
                            >
                              {SHORT_MONTHS.map((m, idx) => (
                                <option key={m} value={idx}>
                                  {MONTH_NAMES[idx]}
                                </option>
                              ))}
                            </select>

                            {/* Pilihan Tahun (Year) */}
                            <select
                              value={datePickerYear}
                              onChange={(e) => setDatePickerYear(Number(e.target.value))}
                              className="bg-[#282a32] text-xs font-semibold text-neutral-200 border border-neutral-700 rounded px-2 py-1 outline-none cursor-pointer hover:border-neutral-500 transition"
                            >
                              {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                                <option key={y} value={y}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (datePickerMonth === 11) {
                                setDatePickerMonth(0)
                                setDatePickerYear((y) => y + 1)
                              } else {
                                setDatePickerMonth((m) => m + 1)
                              }
                            }}
                            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition cursor-pointer"
                            aria-label="Next month"
                          >
                            <ChevronRight size={15} />
                          </button>
                        </div>

                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-neutral-500 mb-1.5">
                          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                            <div key={d}>{d}</div>
                          ))}
                        </div>

                        {/* Calendar days grid (Tanggal) */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {pickerCells.map((cell, cIdx) => {
                            const isSelected = cell.current && cell.day === datePickerDay
                            return (
                              <button
                                key={cIdx}
                                type="button"
                                disabled={!cell.current}
                                onClick={() => {
                                  if (!cell.current) return
                                  setDatePickerDay(cell.day)
                                }}
                                className={`h-7 rounded-md text-xs font-medium transition flex items-center justify-center ${
                                  !cell.current
                                    ? 'text-neutral-600 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-blue-600 text-white font-bold shadow'
                                    : 'text-neutral-300 hover:bg-[#282a32] hover:text-white cursor-pointer'
                                }`}
                              >
                                {cell.day}
                              </button>
                            )
                          })}
                        </div>

                        {/* Bottom Bar: Jam, Hari Ini & Tombol Simpan */}
                        <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 bg-[#282a32] border border-neutral-700/80 rounded px-1.5 py-0.5">
                            <Clock size={11} className="text-neutral-400" />
                            <input
                              type="text"
                              value={datePickerTime}
                              onChange={(e) => setDatePickerTime(e.target.value)}
                              placeholder="12:00 AM"
                              className="w-16 bg-transparent text-[11px] text-white outline-none text-center font-medium"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date()
                                setDatePickerDay(now.getDate())
                                setDatePickerMonth(now.getMonth())
                                setDatePickerYear(now.getFullYear())
                              }}
                              className="text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 transition cursor-pointer"
                            >
                              Hari ini
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const formatted = `${SHORT_MONTHS[datePickerMonth]} ${String(datePickerDay).padStart(2, '0')}, ${datePickerYear}${datePickerTime ? `, ${datePickerTime}` : ''}`
                                setNewTaskDate(formatted)
                                setShowDateDropdown(false)
                              }}
                              className="h-6 px-3 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded shadow transition cursor-pointer"
                            >
                              Pilih
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewItemModal(false)
                      setShowGroupDropdown(false)
                      setShowPersonDropdown(false)
                      setShowStatusDropdown(false)
                      setShowDateDropdown(false)
                    }}
                    className="text-xs text-neutral-400 hover:text-white transition px-3 py-1.5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-8 px-4 text-xs font-semibold text-white bg-[#0073ea] hover:bg-blue-600 rounded-md shadow-sm transition cursor-pointer active:scale-95"
                  >
                    Create Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

      {/* ======================== MANAGE LABELS MODAL ======================== */}
      {showManageLabels && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowManageLabels(false)}
          />
          <div className="relative w-full max-w-md bg-[#16171b] border border-neutral-700/80 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">Manage Status Labels</h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">Create and customize your status labels</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManageLabels(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Existing Labels */}
            <div className="space-y-2 mb-5 max-h-60 overflow-y-auto pr-1">
              {statusList.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1e2025] border border-neutral-800 group"
                >
                  {/* Color Swatch (click to expand palette) */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingLabelId(editingLabelId === s.id ? null : s.id)
                      }
                      className="w-7 h-7 rounded-lg border-2 border-neutral-700 hover:border-white transition cursor-pointer shadow-sm"
                      style={{ backgroundColor: s.colorCode }}
                      title="Change color"
                    />
                    {editingLabelId === s.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setEditingLabelId(null)}
                        />
                        <div className="absolute top-full left-0 mt-1.5 z-20 w-52 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-100">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Pick a Color</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {COLOR_PALETTE.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  handleUpdateLabelColor(s.id, c)
                                  setEditingLabelId(null)
                                }}
                                className="w-8 h-8 rounded-lg border-2 transition cursor-pointer hover:scale-110 hover:border-white"
                                style={{
                                  backgroundColor: c,
                                  borderColor: s.colorCode === c ? 'white' : 'transparent',
                                }}
                                title={c}
                              />
                            ))}
                          </div>
                          {/* Custom hex input */}
                          <div className="mt-2 flex items-center gap-1.5">
                            <div
                              className="w-6 h-6 rounded shrink-0 border border-neutral-600"
                              style={{ backgroundColor: s.colorCode }}
                            />
                            <input
                              type="text"
                              defaultValue={s.colorCode}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = (e.target as HTMLInputElement).value.trim()
                                  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                                    handleUpdateLabelColor(s.id, val)
                                    setEditingLabelId(null)
                                  }
                                }
                              }}
                              placeholder="#hex"
                              className="flex-1 h-7 px-2 bg-[#111214] border border-neutral-700 rounded text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Label name */}
                  <span className="flex-1 text-xs font-medium text-neutral-200 truncate">{s.label}</span>

                  {/* Badge preview */}
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-semibold shrink-0"
                    style={{
                      backgroundColor: s.colorCode,
                      color: getContrastText(s.colorCode),
                    }}
                  >
                    {s.label}
                  </span>

                  {/* Delete button (only for custom labels) */}
                  {!['working', 'done', 'queue', 'stuck'].includes(s.id) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLabel(s.id)}
                      className="p-1 rounded text-neutral-600 hover:text-rose-400 hover:bg-rose-900/20 transition cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                      title="Delete label"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Label Form */}
            <div className="border-t border-neutral-800 pt-4">
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3">Add New Label</p>
              <div className="flex items-center gap-2">
                {/* Color picker trigger */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingLabelId(editingLabelId === 'new' ? null : 'new')}
                    className="w-9 h-9 rounded-xl border-2 border-neutral-600 hover:border-white transition cursor-pointer shadow-sm flex items-center justify-center"
                    style={{ backgroundColor: newLabelColor }}
                    title="Pick color"
                  />
                  {editingLabelId === 'new' && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setEditingLabelId(null)}
                      />
                      <div className="absolute bottom-full left-0 mb-1.5 z-20 w-52 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-100">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Pick a Color</p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {COLOR_PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setNewLabelColor(c)
                                setEditingLabelId(null)
                              }}
                              className="w-8 h-8 rounded-lg border-2 transition cursor-pointer hover:scale-110 hover:border-white"
                              style={{
                                backgroundColor: c,
                                borderColor: newLabelColor === c ? 'white' : 'transparent',
                              }}
                              title={c}
                            />
                          ))}
                        </div>
                        {/* Custom hex input */}
                        <div className="mt-2 flex items-center gap-1.5">
                          <div
                            className="w-6 h-6 rounded shrink-0 border border-neutral-600"
                            style={{ backgroundColor: newLabelColor }}
                          />
                          <input
                            type="text"
                            defaultValue={newLabelColor}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim()
                                if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                                  setNewLabelColor(val)
                                  setEditingLabelId(null)
                                }
                              }
                            }}
                            placeholder="#hex"
                            className="flex-1 h-7 px-2 bg-[#111214] border border-neutral-700 rounded text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddLabel() }}
                  placeholder="Label name..."
                  className="flex-1 h-9 px-3 bg-[#1e2025] border border-neutral-700 rounded-lg text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddLabel}
                  disabled={!newLabelName.trim()}
                  className="h-9 px-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition cursor-pointer shrink-0"
                >
                  Add
                </button>
              </div>

              {/* Live preview */}
              {newLabelName.trim() && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400">Preview:</span>
                  <span
                    className="px-2.5 py-1 rounded text-[11px] font-semibold"
                    style={{
                      backgroundColor: newLabelColor,
                      color: getContrastText(newLabelColor),
                    }}
                  >
                    {newLabelName}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end mt-5 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowManageLabels(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================== ADD WORKSPACE MODAL ======================== */}
      {showAddWorkspaceModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAddWorkspaceModal(false)}
          />
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const name = newWorkspaceName.trim()
              if (!name) return
              const created = await createWorkspace(name).catch(() => null)
              if (created) setWorkspaces((prev) => [...prev, created])
              setSelectedWorkspace(name)
              setNewWorkspaceName('')
              setShowAddWorkspaceModal(false)
            }}
            className="relative w-full max-w-sm bg-[#1e2025] border border-[#343740] rounded-xl shadow-2xl z-10 p-6 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Buat Workspace Baru</h2>
              <button
                type="button"
                onClick={() => setShowAddWorkspaceModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Nama Workspace
            </label>
            <input
              type="text"
              autoFocus
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="mis. 2027 INVISUAL"
              className="w-full h-10 px-3 bg-[#16171b] border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition"
            />

            <div className="flex items-center justify-end gap-3 pt-5">
              <button
                type="button"
                onClick={() => setShowAddWorkspaceModal(false)}
                className="text-xs text-neutral-400 hover:text-white transition px-3 py-1.5 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!newWorkspaceName.trim()}
                className="h-8 px-4 text-xs font-semibold text-white bg-[#0073ea] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shadow-sm transition cursor-pointer active:scale-95"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================== TASK DETAIL MODAL (klik task) ======================== */}
      {detailTask && (() => {
        const group = groups.find((g) => g.id === detailTask.groupId)
        const task = group?.items.find((t) => t.id === detailTask.taskId)
        if (!group || !task) return null
        const statusDef = statusList.find((s) => s.label === task.status) || {
          id: 'none',
          label: task.status,
          colorCode: '#4b5563',
        }
        const close = closeTaskDetail
        const timeNow = () =>
          new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

        const addSubtask = async () => {
          const text = detailSubtaskInput.trim()
          if (!text) return
          const subs = task.subtasks || []
          let id = `sub-${Date.now()}`
          if (projectId) {
            const row = await addSubtaskRow(task.id, text, subs.length).catch(() => null)
            if (row) id = row.id
          }
          updateTask(group.id, task.id, {
            subtasks: [...subs, { id, text, done: false }],
          })
          setDetailSubtaskInput('')
        }

        const toggleSubtask = (subId: string) => {
          const sub = (task.subtasks || []).find((s) => s.id === subId)
          if (projectId && sub) setSubtaskDone(subId, !sub.done).catch(() => {})
          updateTask(group.id, task.id, {
            subtasks: (task.subtasks || []).map((s) =>
              s.id === subId ? { ...s, done: !s.done } : s
            ),
          })
        }

        const deleteSubtask = (subId: string) => {
          if (projectId) deleteSubtaskRow(subId).catch(() => {})
          updateTask(group.id, task.id, {
            subtasks: (task.subtasks || []).filter((s) => s.id !== subId),
          })
        }

        const addAttachment = (name: string) =>
          updateTask(group.id, task.id, {
            attachments: [
              ...(task.attachments || []),
              { id: `att-${Date.now()}`, name, owner: me.name, avatar: me.avatar },
            ],
          })

        const deleteAttachment = (attId: string) =>
          updateTask(group.id, task.id, {
            attachments: (task.attachments || []).filter((a) => a.id !== attId),
          })

        const postComment = async () => {
          const text = detailComment.trim()
          if (!text) return
          let id = `cm-${Date.now()}`
          if (projectId) {
            const row = await addCommentRow(task.id, text).catch(() => null)
            if (row) id = row.id
          }
          updateTask(group.id, task.id, {
            comments: [
              ...(task.comments || []),
              {
                id,
                author: me.name,
                text,
                time: `Today at ${timeNow()}`,
                avatar: me.avatar,
                likes: 0,
                replies: [],
              },
            ],
          })
          setDetailComment('')
        }

        const toggleCommentLike = (commentId: string) => {
          const current = (task.comments || []).find((c) => c.id === commentId)
          if (projectId && current) likeComment(commentId, (current.likes || 0) + 1).catch(() => {})
          updateTask(group.id, task.id, {
            comments: (task.comments || []).map((c) =>
              c.id === commentId ? { ...c, likes: (c.likes || 0) + 1 } : c
            ),
          })
        }

        const toggleCommentReaction = (commentId: string) =>
          updateTask(group.id, task.id, {
            comments: (task.comments || []).map((c) =>
              c.id === commentId ? { ...c, reactions: (c.reactions || 0) + 1 } : c
            ),
          })

        const addReply = async (commentId: string, text: string) => {
          const trimmed = text.trim()
          if (!trimmed) return
          let id = `rep-${Date.now()}`
          if (projectId) {
            const row = await addCommentRow(task.id, trimmed, commentId).catch(() => null)
            if (row) id = row.id
          }
          updateTask(group.id, task.id, {
            comments: (task.comments || []).map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    replies: [
                      ...(c.replies || []),
                      {
                        id,
                        author: me.name,
                        text: trimmed,
                        time: `Today at ${timeNow()}`,
                        avatar: me.avatar,
                      },
                    ],
                  }
                : c
            ),
          })
        }

        const visibleComments = (task.comments || []).filter((c) =>
          `${c.author} ${c.text}`.toLowerCase().includes(commentSearch.toLowerCase())
        )

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 md:p-5">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
            <div
              className={`relative w-full bg-[#0d0e10] border border-[#202227] rounded-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ${
                detailMaximized ? 'max-w-none h-full max-h-none' : 'max-w-[1400px] h-full max-h-[94vh]'
              }`}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between h-11 px-4 border-b border-[#1e2025] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1 text-neutral-400">
                    <button
                      type="button"
                      onClick={() => setDetailMaximized(false)}
                      className="p-1 rounded hover:bg-neutral-800 hover:text-white transition cursor-pointer"
                      title="Perkecil"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailMaximized(true)}
                      className="p-1 rounded hover:bg-neutral-800 hover:text-white transition cursor-pointer"
                      title="Perbesar"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  <span className="text-sm text-neutral-400 truncate">{scopeTitle}</span>
                  <span className="text-neutral-600">/</span>
                  <span className="text-sm font-medium text-white truncate">{cardTitle}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDetailMaximized((v) => !v)}
                    className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                    title={detailMaximized ? 'Perkecil' : 'Perbesar'}
                  >
                    <ChevronsRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                    title="Tutup"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 flex min-h-0">
                {/* Left: task content */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-6 md:px-10 py-8">
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => updateTaskTitle(group.id, task.id, e.target.value)}
                    className="w-full bg-transparent text-2xl md:text-3xl font-bold text-white outline-none border-b border-transparent focus:border-neutral-700 pb-0.5"
                  />

                  <div className="mt-7 space-y-5">
                    {/* Status */}
                    <div className="flex items-center gap-4 relative">
                      <Circle size={17} className="text-neutral-400 shrink-0" />
                      <span className="w-24 shrink-0 text-sm text-neutral-400">Status</span>
                      <button
                        type="button"
                        onClick={() => setDetailStatusOpen((v) => !v)}
                        style={{
                          backgroundColor: statusDef.colorCode,
                          color: getContrastText(statusDef.colorCode),
                        }}
                        className="px-4 py-1 rounded-full text-xs font-semibold transition cursor-pointer hover:brightness-90"
                      >
                        {task.status}
                      </button>

                      {detailStatusOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setDetailStatusOpen(false)} />
                          <div className="absolute left-32 top-9 z-20 w-52 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100">
                            <div className="space-y-1">
                              {statusList.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setTaskStatus(group.id, task.id, s.label)
                                    setDetailStatusOpen(false)
                                  }}
                                  style={{
                                    backgroundColor: s.colorCode,
                                    color: getContrastText(s.colorCode),
                                  }}
                                  className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition cursor-pointer hover:brightness-90"
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-4 relative">
                      <CalendarDays size={17} className="text-neutral-400 shrink-0" />
                      <span className="w-24 shrink-0 text-sm text-neutral-400">Dates</span>
                      <button
                        type="button"
                        onClick={() => setDetailDateOpen((v) => !v)}
                        className="text-sm text-neutral-200 hover:text-white hover:underline transition cursor-pointer"
                      >
                        {task.date}
                      </button>

                      {detailDateOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setDetailDateOpen(false)} />
                          <div className="absolute left-32 top-9 z-20 w-44 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100">
                            {['Mar 28, 2025', 'Mar 29, 2025', 'Mar 30, 2025', 'Apr 02, 2025'].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  setTaskDate(group.id, task.id, d)
                                  setDetailDateOpen(false)
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                                  task.date === d
                                    ? 'bg-blue-600/15 text-blue-400 font-semibold'
                                    : 'text-neutral-200 hover:bg-neutral-800'
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Person */}
                    <div className="flex items-center gap-4 relative">
                      <UserIcon size={17} className="text-neutral-400 shrink-0" />
                      <span className="w-24 shrink-0 text-sm text-neutral-400">Person</span>
                      <div className="flex items-center gap-2">
                        {task.personAvatars.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setDetailPersonOpen((v) => !v)}
                            className="flex items-center -space-x-2 cursor-pointer hover:opacity-80 transition"
                            title="Ubah penanggung jawab"
                          >
                            {task.personAvatars.map((av, i) => (
                              <span
                                key={i}
                                className="relative w-7 h-7 rounded-full border-2 border-[#0d0e10] overflow-hidden bg-neutral-700"
                              >
                                <Image src={av} alt="Assignee" fill sizes="28px" className="object-cover" />
                              </span>
                            ))}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDetailPersonOpen((v) => !v)}
                            className="text-xs text-neutral-500 hover:text-white transition cursor-pointer"
                          >
                            + Add person
                          </button>
                        )}
                        <span className="text-sm text-neutral-300">
                          {(task.personNames || []).join(', ')}
                        </span>
                      </div>

                      {detailPersonOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setDetailPersonOpen(false)} />
                          <div className="absolute left-32 top-10 z-20 w-56 bg-[#1a1b1f] border border-neutral-700/80 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100">
                            {members.map((m) => {
                              const isAssigned = (task.personNames || []).includes(m.name)
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => toggleTaskAssignee(group.id, task.id, m)}
                                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-neutral-800 transition cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="relative w-5 h-5 rounded-full overflow-hidden border border-neutral-700 shrink-0">
                                      <Image src={m.avatar} alt={m.name} fill sizes="20px" className="object-cover" />
                                    </span>
                                    <span className="text-neutral-200 text-xs">{m.name}</span>
                                  </div>
                                  <span
                                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                                      isAssigned ? 'bg-blue-600 border-blue-500 text-white' : 'border-neutral-600'
                                    }`}
                                  >
                                    {isAssigned && <Check size={11} strokeWidth={3} />}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="my-7 border-t border-[#1e2025]" />

                  {/* Description */}
                  <textarea
                    value={task.description || ''}
                    onChange={(e) => updateTaskDescription(group.id, task.id, e.target.value)}
                    placeholder="Add description"
                    rows={3}
                    className="w-full bg-transparent text-sm text-neutral-300 placeholder:text-neutral-500 resize-none outline-none leading-relaxed"
                  />

                  <div className="my-7 border-t border-[#1e2025]" />

                  {/* Subtasks */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setDetailShowSubtasks((v) => !v)}
                      className="flex items-center gap-2.5 text-sm text-neutral-200 hover:text-white transition cursor-pointer"
                    >
                      <ChevronRight
                        size={16}
                        className={`text-neutral-400 transition-transform ${
                          detailShowSubtasks ? 'rotate-90' : ''
                        }`}
                      />
                      <span className="font-medium">Subtasks</span>
                      <span className="text-xs text-neutral-500">
                        {(task.subtasks || []).length} subtasks
                      </span>
                    </button>

                    {detailShowSubtasks && (
                      <div className="mt-3 space-y-1.5">
                        {(task.subtasks || []).map((s) => (
                          <div key={s.id} className="flex items-center gap-2 group/sub pl-6">
                            <button
                              type="button"
                              onClick={() => toggleSubtask(s.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer shrink-0 ${
                                s.done ? 'bg-blue-600 border-blue-500 text-white' : 'border-neutral-600'
                              }`}
                            >
                              {s.done && <Check size={11} strokeWidth={3} />}
                            </button>
                            <span
                              className={`flex-1 text-sm ${
                                s.done ? 'text-neutral-500 line-through' : 'text-neutral-200'
                              }`}
                            >
                              {s.text}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteSubtask(s.id)}
                              className="p-1 rounded text-neutral-600 hover:text-rose-400 opacity-0 group-hover/sub:opacity-100 transition cursor-pointer"
                              title="Hapus subtask"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}

                        <div className="pl-6 flex items-center gap-2">
                          <input
                            type="text"
                            value={detailSubtaskInput}
                            onChange={(e) => setDetailSubtaskInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addSubtask()
                              }
                            }}
                            placeholder="Add subtask..."
                            className="flex-1 bg-transparent text-sm text-neutral-200 placeholder:text-neutral-500 outline-none py-1"
                          />
                          {detailSubtaskInput.trim() && (
                            <button
                              type="button"
                              onClick={addSubtask}
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition cursor-pointer"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="my-7 border-t border-[#1e2025]" />

                  {/* Attach file */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setDetailShowAttach((v) => !v)}
                      className="flex items-center gap-2.5 text-sm text-neutral-200 hover:text-white transition cursor-pointer"
                    >
                      <ChevronDown
                        size={16}
                        className={`text-neutral-400 transition-transform ${
                          detailShowAttach ? '' : '-rotate-90'
                        }`}
                      />
                      <span className="font-medium">Attach file</span>
                      <span className="text-xs text-neutral-500">
                        {(task.attachments || []).length} file
                      </span>
                    </button>

                    {detailShowAttach && (
                      <div className="mt-4 space-y-4">
                        {/* Dropzone */}
                        <label
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            Array.from(e.dataTransfer.files).forEach((f) => addAttachment(f.name))
                          }}
                          className="flex items-center justify-center h-14 rounded-lg border border-dashed border-neutral-700 bg-[#141518]/60 hover:border-neutral-500 hover:bg-[#16171b] transition cursor-pointer"
                        >
                          <span className="text-sm text-neutral-400">Drop or browse file here</span>
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              Array.from(e.target.files || []).forEach((f) => addAttachment(f.name))
                              e.target.value = ''
                            }}
                          />
                        </label>

                        {/* File cards */}
                        {(task.attachments || []).length > 0 && (
                          <div className="flex flex-wrap gap-4">
                            {(task.attachments || []).map((a) => (
                              <div
                                key={a.id}
                                className="relative w-[210px] rounded-xl border border-[#24262c] bg-[#181a1d] group/att hover:border-neutral-600 transition"
                              >
                                <div className="h-[118px] flex items-center justify-center">
                                  <FileText size={40} strokeWidth={1.4} className="text-[#3b82f6]" />
                                </div>
                                <div className="flex items-center justify-between px-3 pb-3">
                                  <span className="text-[11px] text-neutral-300 truncate max-w-[110px]">
                                    {a.name}
                                  </span>
                                  {a.avatar ? (
                                    <span className="relative w-6 h-6 rounded-full overflow-hidden border border-neutral-700 shrink-0">
                                      <Image src={a.avatar} alt={a.owner || 'Uploader'} fill sizes="24px" className="object-cover" />
                                    </span>
                                  ) : (
                                    <span className="w-6 h-6 rounded-full bg-neutral-700 text-[10px] font-semibold text-white flex items-center justify-center shrink-0">
                                      {(a.owner || 'U').charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteAttachment(a.id)}
                                  className="absolute top-2 right-2 p-1 rounded-md bg-black/40 text-neutral-300 hover:text-rose-400 hover:bg-black/60 opacity-0 group-hover/att:opacity-100 transition cursor-pointer"
                                  title="Hapus lampiran"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: comments */}
                <div className="hidden md:flex w-[360px] lg:w-[420px] shrink-0 border-l border-[#1e2025] flex-col">
                  <div className="h-12 px-4 flex items-center justify-between border-b border-[#1e2025] shrink-0 gap-2">
                    {showCommentSearch ? (
                      <div className="flex-1 flex items-center gap-2 h-8 px-2.5 rounded-lg bg-[#141518] border border-[#2a2c32]">
                        <Search size={14} className="text-neutral-500 shrink-0" />
                        <input
                          type="text"
                          autoFocus
                          value={commentSearch}
                          onChange={(e) => setCommentSearch(e.target.value)}
                          placeholder="Cari komentar..."
                          className="flex-1 bg-transparent text-xs text-neutral-200 placeholder:text-neutral-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCommentSearch(false)
                            setCommentSearch('')
                          }}
                          className="text-neutral-500 hover:text-white transition cursor-pointer"
                          title="Tutup pencarian"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-neutral-200">
                          Comments
                          {(task.comments || []).length > 0 && (
                            <span className="ml-2 text-xs text-neutral-500">
                              {(task.comments || []).length}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCommentSearch(true)}
                          className="p-1 rounded text-neutral-400 hover:text-white transition cursor-pointer"
                          title="Cari komentar"
                        >
                          <Search size={16} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                    {visibleComments.length === 0 ? (
                      <p className="text-xs text-neutral-600 text-center mt-8">
                        {commentSearch ? 'Komentar tidak ditemukan.' : 'Belum ada komentar.'}
                      </p>
                    ) : (
                      visibleComments.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-xl border border-[#24262c] bg-[#181a1d] p-3"
                        >
                          <div className="flex gap-2.5">
                            {c.avatar ? (
                              <span className="relative w-7 h-7 rounded-full overflow-hidden shrink-0">
                                <Image
                                  src={c.avatar}
                                  alt={c.author}
                                  fill
                                  sizes="28px"
                                  className="object-cover"
                                />
                              </span>
                            ) : (
                              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                                {c.author.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-neutral-200">
                                  {c.author}
                                </span>
                                <span className="text-[10px] text-neutral-500">{c.time}</span>
                              </div>
                              <p className="text-sm text-neutral-300 break-words mt-1">
                                {c.text}
                              </p>

                              {(c.replies || []).length > 0 && (
                                <div className="mt-2 space-y-2 border-l border-[#2a2c32] pl-3">
                                  {(c.replies || []).map((r) => (
                                    <div key={r.id} className="flex gap-2">
                                      {r.avatar ? (
                                        <span className="relative w-6 h-6 rounded-full overflow-hidden shrink-0">
                                          <Image
                                            src={r.avatar}
                                            alt={r.author}
                                            fill
                                            sizes="24px"
                                            className="object-cover"
                                          />
                                        </span>
                                      ) : (
                                        <span className="w-6 h-6 rounded-full bg-neutral-700 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                                          {r.author.charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-semibold text-neutral-200">
                                            {r.author}
                                          </span>
                                          <span className="text-[10px] text-neutral-500">
                                            {r.time}
                                          </span>
                                        </div>
                                        <p className="text-xs text-neutral-300 break-words">
                                          {r.text}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center gap-4 mt-2 text-neutral-400">
                                <button
                                  type="button"
                                  onClick={() => toggleCommentLike(c.id)}
                                  className="flex items-center gap-1 text-[11px] hover:text-white transition cursor-pointer"
                                  title="Suka"
                                >
                                  <ThumbsUp size={13} />
                                  {(c.likes || 0) > 0 && <span>{c.likes}</span>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleCommentReaction(c.id)}
                                  className="flex items-center gap-1 text-[11px] hover:text-white transition cursor-pointer"
                                  title="Emoji"
                                >
                                  <Smile size={13} />
                                  {(c.reactions || 0) > 0 && <span>{c.reactions}</span>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailReplyTo((v) => (v === c.id ? null : c.id))
                                    setDetailReplyText('')
                                  }}
                                  className="text-[11px] hover:text-white transition cursor-pointer"
                                >
                                  Reply
                                </button>
                              </div>

                              {detailReplyTo === c.id && (
                                <div className="flex items-center gap-2 mt-2">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={detailReplyText}
                                    onChange={(e) => setDetailReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault()
                                        addReply(c.id, detailReplyText)
                                        setDetailReplyTo(null)
                                        setDetailReplyText('')
                                      }
                                      if (e.key === 'Escape') setDetailReplyTo(null)
                                    }}
                                    placeholder="Tulis balasan..."
                                    className="flex-1 bg-transparent text-xs text-neutral-200 placeholder:text-neutral-500 outline-none border-b border-[#2a2c32] pb-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      addReply(c.id, detailReplyText)
                                      setDetailReplyTo(null)
                                      setDetailReplyText('')
                                    }}
                                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition cursor-pointer"
                                  >
                                    Kirim
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-4 shrink-0">
                    <div className="rounded-xl border border-[#2a2c32] bg-[#141518] p-3">
                      <textarea
                        value={detailComment}
                        onChange={(e) => setDetailComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            postComment()
                          }
                        }}
                        placeholder="Write a comment.."
                        rows={2}
                        className="w-full bg-transparent text-sm text-neutral-200 placeholder:text-neutral-500 resize-none outline-none"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 text-neutral-400">
                          <label className="cursor-pointer" title="Attach file">
                            <Paperclip size={16} className="hover:text-white transition" />
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) addAttachment(f.name)
                                e.target.value = ''
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setDetailComment((v) => (v ? v : ':smile: '))
                            }
                            className="cursor-pointer"
                            title="Emoji"
                          >
                            <Smile size={16} className="hover:text-white transition" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={postComment}
                          disabled={!detailComment.trim()}
                          className="w-9 h-9 rounded-lg bg-[#2563eb] hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center text-white transition cursor-pointer"
                          title="Kirim komentar"
                        >
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
