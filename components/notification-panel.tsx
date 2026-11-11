'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { AtSign, Bookmark, ChevronDown, ChevronRight, Loader2, Reply, ThumbsUp, X } from 'lucide-react'
import {
  addComment,
  getSessionProfile,
  likeComment,
  listNotifications,
  type NotificationItem,
} from '@/lib/db'

const STORE_KEY = 'invisual.notifications'

type Tab = 'all' | 'mention' | 'bookmarked'

// Baca/tulis preferensi lokal (bookmark + waktu terakhir panel dibuka).
function readStore(): { bookmarks: string[]; seenAt: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}')
    return { bookmarks: raw.bookmarks ?? [], seenAt: raw.seenAt ?? '' }
  } catch {
    return { bookmarks: [], seenAt: '' }
  }
}

function relativeTime(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}

function Avatar({ name, src, size = 40 }: { name: string; src: string | null; size?: number }) {
  if (src) {
    return (
      <div className="rounded-full overflow-hidden border border-neutral-700 shrink-0" style={{ width: size, height: size }}>
        <Image src={src} alt={name} width={size} height={size} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className="rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center text-xs font-semibold text-neutral-200 shrink-0"
      style={{ width: size, height: size }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('all')
  const [board, setBoard] = useState<string | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [myName, setMyName] = useState('')
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [seenAt, setSeenAt] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const wasOpen = useRef(false)

  useEffect(() => {
    if (!open) return
    const store = readStore()
    setBookmarks(store.bookmarks)
    setSeenAt(store.seenAt)
    setNotice('')
    setLoading(true)
    Promise.all([listNotifications(), getSessionProfile().catch(() => null)])
      .then(([rows, profile]) => {
        setItems(rows)
        setMyName(profile?.name ?? '')
      })
      .catch((e) => setNotice(e?.message || 'Gagal memuat notifikasi.'))
      .finally(() => setLoading(false))
  }, [open])

  // Tandai sudah dibaca saat panel ditutup, bukan saat dibuka.
  useEffect(() => {
    if (open) {
      wasOpen.current = true
      return
    }
    if (!wasOpen.current) return
    wasOpen.current = false
    const now = new Date().toISOString()
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), seenAt: now }))
    setSeenAt(now)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const boards = useMemo(
    () => Array.from(new Set(items.map((i) => i.board))).filter(Boolean),
    [items],
  )

  const visible = useMemo(
    () =>
      items.filter((i) => {
        if (tab === 'mention' && (!myName || !i.body.includes(`@${myName}`))) return false
        if (tab === 'bookmarked' && !bookmarks.includes(i.id)) return false
        if (board && i.board !== board) return false
        if (unreadOnly && seenAt && i.created_at <= seenAt) return false
        return true
      }),
    [items, tab, myName, bookmarks, board, unreadOnly, seenAt],
  )

  if (!open) return null

  const toggleBookmark = (id: string) => {
    const next = bookmarks.includes(id) ? bookmarks.filter((b) => b !== id) : [...bookmarks, id]
    setBookmarks(next)
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), bookmarks: next }))
  }

  const onLike = async (item: NotificationItem) => {
    const next = item.likes + 1
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, likes: next } : p)))
    try {
      await likeComment(item.id, next)
    } catch (e: any) {
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, likes: item.likes } : p)))
      setNotice(e?.message || 'Gagal menyimpan like.')
    }
  }

  const onReply = async (item: NotificationItem) => {
    const body = (drafts[item.id] || '').trim()
    if (!body) return
    setDrafts((d) => ({ ...d, [item.id]: '' }))
    try {
      await addComment(item.task_id, body, item.id)
      setItems(await listNotifications())
      setNotice('Balasan terkirim.')
    } catch (e: any) {
      setNotice(e?.message || 'Gagal mengirim balasan.')
    }
  }

  const tabClass = (t: Tab) =>
    `flex items-center gap-1.5 px-4 py-3 text-sm border-b-2 transition cursor-pointer ${
      tab === t
        ? 'border-blue-500 text-white font-medium'
        : 'border-transparent text-neutral-400 hover:text-neutral-200'
    }`

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-3">
      <div className="w-full h-full max-w-[1800px] max-h-[92vh] bg-[#141517] border border-neutral-800 rounded-2xl shadow-2xl text-white flex flex-col overflow-hidden font-sans">
        <header className="flex items-center gap-10 px-8 pt-5 shrink-0 border-b border-neutral-800/80">
          <h2 className="text-3xl font-bold tracking-tight pb-3">Notification</h2>
          <nav className="flex items-center gap-1 self-end">
            <button type="button" className={tabClass('all')} onClick={() => setTab('all')}>
              All Notification
            </button>
            <button type="button" className={tabClass('mention')} onClick={() => setTab('mention')}>
              <AtSign size={15} strokeWidth={1.8} />
              I got a mention
            </button>
            <button type="button" className={tabClass('bookmarked')} onClick={() => setTab('bookmarked')}>
              <Bookmark size={15} strokeWidth={1.8} />
              Bookmarked
            </button>
          </nav>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup notifikasi"
            className="ml-auto self-start mt-2 p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-64 shrink-0 border-r border-neutral-800/80 p-6 overflow-y-auto">
            <p className="text-base font-semibold text-neutral-100 mb-3">Sort by Board</p>
            <div className="space-y-1">
              {[null, ...boards].map((b) => (
                <button
                  key={b ?? 'all'}
                  type="button"
                  onClick={() => setBoard(b)}
                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition cursor-pointer ${
                    board === b
                      ? 'bg-blue-600 text-white font-medium shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                  }`}
                >
                  {b ?? 'All Board'}
                </button>
              ))}
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-8">
            <button
              type="button"
              onClick={() => setUnreadOnly((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-white transition cursor-pointer mb-6"
            >
              {unreadOnly ? 'Show All notification' : 'Show Unread notification'}
              <ChevronDown size={16} className={`transition-transform ${unreadOnly ? 'rotate-180' : ''}`} />
            </button>

            {notice && <p className="mb-4 text-xs text-red-400">{notice}</p>}

            {loading ? (
              <p className="flex items-center gap-2 text-sm text-neutral-400">
                <Loader2 size={16} className="animate-spin" /> Memuat…
              </p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Belum ada notifikasi{unreadOnly ? ' yang belum dibaca' : ''} di sini.
              </p>
            ) : (
              <div className="space-y-5 max-w-4xl">
                {visible.map((item) => {
                  const crumbs = [item.scope, item.group_title, item.task_title].filter(Boolean)
                  const marked = bookmarks.includes(item.id)
                  return (
                    <article
                      key={item.id}
                      className="bg-[#1a1b1f] border border-neutral-800/90 rounded-2xl overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={item.author_name} src={item.author_avatar} />
                          <span className="text-sm font-semibold text-neutral-100">{item.author_name}</span>
                          <span className="text-xs text-neutral-500">{relativeTime(item.created_at)}</span>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(item.id)}
                            aria-label={marked ? 'Hapus bookmark' : 'Simpan bookmark'}
                            className="ml-auto p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800/60 transition cursor-pointer"
                          >
                            <Bookmark
                              size={15}
                              fill={marked ? 'currentColor' : 'none'}
                              className={marked ? 'text-yellow-400' : ''}
                            />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-neutral-400">
                          {crumbs.map((c, i) => (
                            <span key={`${item.id}-${c}-${i}`} className="flex items-center gap-2">
                              {i > 0 && <ChevronRight size={14} className="text-neutral-600" />}
                              <span className={i === crumbs.length - 1 ? 'text-neutral-200' : ''}>{c}</span>
                            </span>
                          ))}
                        </div>

                        <p className="mt-4 text-sm text-neutral-200 whitespace-pre-wrap">{item.body}</p>
                      </div>

                      <div className="border-t border-neutral-800/90 px-5 py-3 flex items-center gap-6 text-sm text-neutral-400">
                        <button
                          type="button"
                          onClick={() => onLike(item)}
                          className="flex items-center gap-2 hover:text-white transition cursor-pointer"
                        >
                          <ThumbsUp size={15} strokeWidth={1.8} />
                          Like
                          {item.likes > 0 && <span className="text-xs text-neutral-500">{item.likes}</span>}
                        </button>
                        <span className="flex items-center gap-2">
                          <Reply size={15} strokeWidth={1.8} />
                          Reply
                        </span>
                      </div>

                      <div className="border-t border-neutral-800/90 px-5 py-4 flex items-center gap-3">
                        <Avatar name="Me" src={null} size={36} />
                        <input
                          value={drafts[item.id] || ''}
                          onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              onReply(item)
                            }
                          }}
                          placeholder="Write a reply"
                          className="flex-1 bg-transparent border border-neutral-700/80 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-blue-500/70 transition"
                        />
                        <button
                          type="button"
                          onClick={() => onReply(item)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 transition cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
