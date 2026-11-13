'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react'
import {
  addMemberByEmail,
  listProjectMembers,
  removeMember,
  updateMemberRole,
  type ProjectMemberRow,
} from '@/lib/db'
import { roleLabel, useProjectPermissions } from '@/lib/permissions'

// Halaman Anggota Proyek (UC-03). Dipisah dari board karena skenario use case
// menyebut "halaman Anggota Proyek", bukan panel di dalam board.
export function ProjectMembersPage({
  projectId,
  scopeTitle,
  cardTitle,
}: {
  projectId: string
  scopeTitle: string
  cardTitle: string
}) {
  const router = useRouter()
  const permissions = useProjectPermissions(projectId)
  const can = permissions

  const [members, setMembers] = useState<ProjectMemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'project_manager' | 'member'>('member')
  const [inviteError, setInviteError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setError('')
    try {
      setMembers(await listProjectMembers(projectId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat anggota.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email || busy) return
    setBusy(true)
    setInviteError('')
    try {
      await addMemberByEmail(projectId, email, inviteRole)
      await refresh()
      setNotice(`${email} ditambahkan sebagai ${roleLabel(inviteRole)}.`)
      setInviteEmail('')
      setInviteRole('member')
      setShowInvite(false)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Gagal mengundang anggota.')
    } finally {
      setBusy(false)
    }
  }

  const handleRoleChange = async (userId: string, role: 'project_manager' | 'member') => {
    setError('')
    try {
      await updateMemberRole(projectId, userId, role)
      await refresh()
      setNotice('Peran anggota diperbarui.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah peran.')
    }
  }

  const handleRemove = async (userId: string, name: string) => {
    setError('')
    try {
      await removeMember(projectId, userId)
      await refresh()
      setNotice(`${name} dikeluarkan dari project.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengeluarkan anggota.')
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#111214] text-white">
      <header className="w-full h-16 bg-[#111214] border-b border-neutral-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
        <Link href="/home" className="flex items-center gap-2.5">
          <span className="font-bold text-neutral-400 tracking-wider text-sm hover:text-white transition">
            INVISUAL
          </span>
        </Link>
        <button
          type="button"
          onClick={() => router.push(`/project/${scopeTitle}/${cardTitle}`)}
          className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft size={15} />
          Kembali ke board
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="text-xs text-neutral-500">
            {scopeTitle} / {cardTitle}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold tracking-tight">Anggota Proyek</h1>
            {!permissions.loading && permissions.role && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${
                  permissions.isManager
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-neutral-700/40 text-neutral-300 border-neutral-600/60'
                }`}
              >
                {permissions.isManager ? <ShieldCheck size={11} /> : <UserIcon size={11} />}
                {roleLabel(permissions.role)}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Peran di halaman ini hanya berlaku untuk project ini.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        <div className="rounded-2xl border border-neutral-800/80 bg-[#141517] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">
              Daftar Anggota{' '}
              <span className="text-neutral-500 font-normal">({members.length})</span>
            </h2>
            {can.inviteMembers && (
              <button
                type="button"
                onClick={() => {
                  setInviteEmail('')
                  setInviteRole('member')
                  setInviteError('')
                  setShowInvite(true)
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
                Tambah Anggota
              </button>
            )}
          </div>

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-neutral-400 py-6">
              <Loader2 size={15} className="animate-spin" /> Memuat anggota…
            </p>
          ) : members.length === 0 ? (
            <p className="text-sm text-neutral-500 py-6 text-center">
              Belum ada anggota pada project ini.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-800/70">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800 flex items-center justify-center shrink-0">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-semibold text-neutral-300">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{m.name}</p>
                    <p className="text-xs text-neutral-500 truncate flex items-center gap-1.5">
                      <Mail size={11} />
                      {m.email || '—'}
                    </p>
                  </div>

                  {can.manageRoles ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={m.role}
                        onChange={(e) =>
                          handleRoleChange(m.id, e.target.value as 'project_manager' | 'member')
                        }
                        className="h-9 px-2 bg-[#1b1c20] border border-neutral-700 rounded-lg text-xs text-neutral-200 outline-none focus:border-blue-500 cursor-pointer"
                        aria-label={`Peran ${m.name}`}
                      >
                        <option value="member">Member</option>
                        <option value="project_manager">Project Manager</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemove(m.id, m.name)}
                        className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                        title="Keluarkan dari project"
                        aria-label={`Keluarkan ${m.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400 shrink-0">
                      {roleLabel(m.role)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {showInvite && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowInvite(false)}
          />
          <form
            onSubmit={handleInvite}
            className="relative w-full max-w-sm bg-[#1e2025] border border-[#343740] rounded-xl shadow-2xl z-10 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Tambah Anggota</h2>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <label htmlFor="invite-email" className="block text-xs font-medium text-neutral-400 mb-1.5">
              Email anggota
            </label>
            <input
              id="invite-email"
              type="email"
              autoFocus
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full h-10 px-3 bg-[#16171b] border border-neutral-700 rounded-lg text-sm text-white placeholder:text-neutral-500 outline-none focus:border-blue-500 transition"
            />

            <label htmlFor="invite-role" className="block text-xs font-medium text-neutral-400 mt-4 mb-1.5">
              Peran pada project
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'project_manager' | 'member')}
              className="w-full h-10 px-3 bg-[#16171b] border border-neutral-700 rounded-lg text-sm text-white outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="member">Member</option>
              <option value="project_manager">Project Manager</option>
            </select>

            <p className="mt-2 text-[11px] text-neutral-500">
              Anggota harus sudah punya akun di aplikasi ini.
            </p>
            {inviteError && <p className="mt-3 text-xs text-red-400">{inviteError}</p>}

            <div className="flex items-center justify-end gap-3 pt-5">
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="text-xs text-neutral-400 hover:text-white transition px-3 py-1.5 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!inviteEmail.trim() || busy}
                className="h-8 px-4 text-xs font-semibold text-white bg-[#0073ea] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-md shadow-sm transition cursor-pointer active:scale-95"
              >
                {busy ? 'Menambahkan…' : 'Tambah'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
