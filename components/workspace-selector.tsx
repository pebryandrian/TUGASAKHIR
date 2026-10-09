'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, LayoutGrid, Plus, Search, X } from 'lucide-react'
import { createWorkspace, listWorkspaces, type Workspace } from '@/lib/db'

// Pemilih workspace dengan dropdown (search + recent) dan modal "Buat Workspace Baru".
// Dipakai bersama oleh sidebar Home, Profile, dan halaman project.
export function WorkspaceSelector({ initial = '2026 INVISUAL' }: { initial?: string }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selected, setSelected] = useState(initial)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    listWorkspaces()
      .then((rows) => {
        setWorkspaces(rows)
        if (rows.length > 0 && !rows.some((w) => w.name === initial)) {
          setSelected(rows[0].name)
        }
      })
      .catch(() => setWorkspaces([]))
  }, [initial])

  const filtered = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(query.toLowerCase())
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const created = await createWorkspace(trimmed)
    setWorkspaces((prev) => [...prev, created])
    setSelected(created.name)
    setName('')
    setShowModal(false)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-[#191a1e] border border-neutral-700/80 rounded-xl px-3 py-2 text-sm cursor-pointer hover:border-neutral-600 transition"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="w-5 h-5 rounded bg-fuchsia-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                I
              </span>
              <span className="text-xs font-semibold text-white truncate">{selected}</span>
            </div>
            <ChevronDown size={15} className="text-neutral-400 shrink-0" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
              <div className="absolute left-0 top-full mt-1.5 z-30 w-[286px] bg-[#191a1e] border border-neutral-700/80 rounded-xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-neutral-700 bg-[#111214]">
                  <Search size={15} className="text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for a workspace"
                    className="bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none w-full"
                  />
                </div>

                <p className="text-xs font-semibold text-neutral-300 mt-3 mb-1 px-1">
                  Recent workspace
                </p>
                <div className="space-y-0.5 max-h-56 overflow-y-auto">
                  {filtered.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        setSelected(ws.name)
                        setOpen(false)
                        setQuery('')
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
                        ws.name === selected
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      {ws.name}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-3 py-2 text-xs text-neutral-500">
                      Workspace tidak ditemukan.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      setName('')
                      setShowModal(true)
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Workspace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
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
            setName('')
            setShowModal(true)
          }}
          className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition shadow-sm cursor-pointer"
          aria-label="Add workspace"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <form
            onSubmit={handleCreate}
            className="relative w-full max-w-sm bg-[#1e2025] border border-[#343740] rounded-xl shadow-2xl z-10 p-6 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Buat Workspace Baru</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. 2027 INVISUAL"
              className="w-full h-10 px-3 bg-[#16171b] border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition"
            />

            <div className="flex items-center justify-end gap-3 pt-5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xs text-neutral-400 hover:text-white transition px-3 py-1.5 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="h-8 px-4 text-xs font-semibold text-white bg-[#0073ea] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shadow-sm transition cursor-pointer active:scale-95"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
