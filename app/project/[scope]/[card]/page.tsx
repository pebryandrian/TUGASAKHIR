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

// ======================== DOC BLOCK TYPES ========================
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

const teamMembers = [
  { id: 'm-1', name: 'George', role: 'Product Lead', avatar: '/images/clients/SUNDDAE.jpg' },
  { id: 'm-2', name: 'Jordan Fufu', role: 'Senior Designer', avatar: '/images/clients/CONTROVERSIAL.webp' },
  { id: 'm-3', name: 'Puput Atira', role: 'UI/UX Designer', avatar: '/images/clients/ASIAN-MOOD.webp' },
  { id: 'm-4', name: 'Rahmat Sudianto', role: 'Illustrator', avatar: '/images/clients/SOAR.webp' },
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

  // ======================== DOC TAB STATE & HISTORY ========================
  const [docBlocks, setDocBlocks] = useState<DocBlock[]>(initialDocBlocks)
  const [history, setHistory] = useState<DocBlock[][]>([initialDocBlocks])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [activeBlockId, setActiveBlockId] = useState<string>('block-1')
  const [lastUpdated, setLastUpdated] = useState('Apr 13, 2026, 22:43')

  // Toolbars dropdown states
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showTextStyleDropdown, setShowTextStyleDropdown] = useState(false)
  const [showAlignMenu, setShowAlignMenu] = useState(false)
  const [showStyleMenu, setShowStyleMenu] = useState(false)
  const [showMentionMenu, setShowMentionMenu] = useState(false)

  // Helper to commit changes to history
  const commitBlocksChange = (newBlocks: DocBlock[]) => {
    setDocBlocks(newBlocks)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newBlocks)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    // Update timestamp
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setLastUpdated(`Today, ${timeStr}`)
  }

  // Undo / Redo
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

  // Active block reference
  const activeBlock = docBlocks.find((b) => b.id === activeBlockId) || docBlocks[0]

  // Text Style options
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

  // Apply Text Style (T, H1, H2, H3, <>)
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

  // Apply Alignment
  const applyAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
    const updated = docBlocks.map((b) => {
      if (b.id !== activeBlock.id) return b
      return { ...b, align }
    })
    commitBlocksChange(updated)
    setShowAlignMenu(false)
  }

  // Apply Character Styles (Bold, Italic, Underline, Strikethrough, Color, Bg)
  const toggleStyle = (styleKey: keyof NonNullable<DocBlock['styles']>, value?: any) => {
    const updated = docBlocks.map((b) => {
      if (b.id !== activeBlock.id) return b
      const curStyles = b.styles || {}
      let nextStyles = { ...curStyles }
      if (typeof value !== 'undefined') {
        nextStyles[styleKey] = curStyles[styleKey] === value ? undefined : value
      } else {
        nextStyles[styleKey] = !curStyles[styleKey]
      }
      return { ...b, styles: nextStyles }
    })
    commitBlocksChange(updated)
  }

  // Convert/Insert Lists
  const applyListType = (type: 'bullet-list' | 'numbered-list' | 'checklist') => {
    const updated = docBlocks.map((b) => {
      if (b.id !== activeBlock.id) return b
      if (b.type === type) {
        // Toggle back to paragraph
        return { ...b, type: 'paragraph', items: undefined }
      }
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

  // Insert Mention
  const insertMention = (member: (typeof teamMembers)[0]) => {
    const updated = docBlocks.map((b) => {
      if (b.id !== activeBlock.id) return b
      const append = ` @${member.name} `
      return { ...b, content: (b.content || '') + append }
    })
    commitBlocksChange(updated)
    setShowMentionMenu(false)
  }

  // Add New Block from "+ Add"
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

  // Delete Block
  const deleteBlock = (blockId: string) => {
    if (docBlocks.length <= 1) {
      alert('Dokumen minimal memiliki satu blok konten.')
      return
    }
    const updated = docBlocks.filter((b) => b.id !== blockId)
    commitBlocksChange(updated)
    if (activeBlockId === blockId) {
      setActiveBlockId(updated[0]?.id || '')
    }
  }

  // Update block content
  const updateBlockContent = (blockId: string, content: string) => {
    const updated = docBlocks.map((b) => (b.id === blockId ? { ...b, content } : b))
    commitBlocksChange(updated)
  }

  // Update list item
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

  // Toggle checklist item
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

  // Add item to list
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

  // Group collapse & Task actions
  const toggleGroupCollapse = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))
    )
  }

  const toggleTaskCheck = (groupId: string, taskId: string) => {
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

  const cycleStatus = (groupId: string, taskId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        return {
          ...g,
          items: g.items.map((t) => {
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

  const handleAddNewItem = () => {
    const targetGroup = groups.find((g) => !g.collapsed) || groups[0]
    const newItemTitle = prompt('Enter new task title:')
    if (!newItemTitle || !newItemTitle.trim()) return

    setGroups((prev) =>
      prev.map((g) => {
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

  // Build CSS classes for block text
  const getBlockStyleClasses = (block: DocBlock) => {
    const classes: string[] = []

    // Type styling
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

    // Alignment
    if (block.align === 'center') classes.push('text-center')
    else if (block.align === 'right') classes.push('text-right')
    else if (block.align === 'justify') classes.push('text-justify')
    else classes.push('text-left')

    // Formatting styles
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
                    const inQueueCount = group.items.filter((i) => i.status === 'In Queue').length
                    const workingCount = group.items.filter(
                      (i) => i.status === 'Working on it'
                    ).length
                    const doneCount = group.items.filter((i) => i.status === 'Done').length

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

            {/* TAB 2: DOC (CLIENT BRIEF) - REAL WORD / DOC APPLICATION */}
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

                  {/* Functional Style Popover (Bold, Italic, Underline, Color, Highlight) */}
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
                      title="Text styling (Bold, Italic, Underline, Colors)"
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
                          {/* Font Styles: B, I, U, S */}
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

                          {/* Text Colors */}
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

                          {/* Highlight Background Tint */}
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

                  {/* Functional Mention @ Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMentionMenu(!showMentionMenu)}
                      className="p-1.5 hover:text-white hover:bg-neutral-800/60 rounded transition cursor-pointer text-neutral-300"
                      title="Mention team member (@)"
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
                            Mention Team Member
                          </div>
                          <div className="p-1 space-y-0.5">
                            {teamMembers.map((member) => (
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
                        <span className="text-neutral-200">Apr 13, 2026, 20:56</span>
                      </div>

                      {/* Last Updated */}
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Clock size={13} className="text-neutral-500" />
                        <span>Last updated</span>
                        <span className="text-neutral-200">{lastUpdated}</span>
                      </div>

                      {/* Auto-saved badge */}
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
                          {/* Block Delete Action Button on Hover */}
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

                          {/* Block: Paragraph / Headings / Quote */}
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

                          {/* Block: Bullet List */}
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

                          {/* Block: Numbered List */}
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

                          {/* Block: Interactive Checklist / Tasks */}
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

                          {/* Block: Attached Word Document */}
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
                                    alert(`Downloading ${block.fileData?.name} (${block.fileData?.size})`)
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

                          {/* Block: Image Preview */}
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

                          {/* Block: Divider */}
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
