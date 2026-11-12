'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
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
  ArrowLeft,
  Camera,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  User,
  LogOut,
  Lock,
} from 'lucide-react'
import { WorkspaceSelector } from '@/components/workspace-selector'
import { getSessionProfile, updateProfile, changePassword, uploadAvatar } from '@/lib/db'
import { signOut } from '@/lib/auth'

type Role = 'Team Member' | 'Project Manager' | 'Admin' | 'Owner'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ProfileData {
  firstName: string
  lastName: string
  email: string
  role: Role
  avatarUrl: string | null
}

const emptyProfile: ProfileData = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'Team Member',
  avatarUrl: null,
}

// Kolom `profiles` hanya punya name/email/role/avatar_url, jadi hanya itu yang
// bisa disimpan. Email & role ditampilkan sebagai informasi (read-only).
export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const [profile, setProfile] = useState<ProfileData>(emptyProfile)
  const [form, setForm] = useState<ProfileData>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Ubah password
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null)
  // Berkas baru yang belum diunggah. Disimpan terpisah dari `avatarPreview`
  // karena foto profil diunggah ke Supabase Storage (F-14), bukan base64 di DB.
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const isDirty =
    form.firstName !== profile.firstName ||
    form.lastName !== profile.lastName ||
    avatarPreview !== savedAvatar

  // Muat profil pengguna yang sedang login dari Supabase.
  useEffect(() => {
    getSessionProfile()
      .then((p) => {
        if (!p) {
          setLoadError('Profil tidak ditemukan. Coba login ulang.')
          return
        }
        const [firstName, ...rest] = p.name.split(' ')
        const loaded: ProfileData = {
          firstName: firstName ?? '',
          lastName: rest.join(' '),
          email: p.email,
          role: p.role === 'project_manager' ? 'Project Manager' : 'Team Member',
          avatarUrl: p.avatar_url,
        }
        setProfile(loaded)
        setForm(loaded)
        setSavedAvatar(p.avatar_url)
        setAvatarPreview(p.avatar_url)
      })
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat profil.'),
      )
      .finally(() => setLoading(false))
  }, [])

  const handleFieldChange = (field: 'firstName' | 'lastName', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const processAvatarFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setSaveError('File harus berupa gambar.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveError('Ukuran gambar maksimal 2 MB.')
      return
    }
    setSaveError('')
    setPendingAvatar(file)
    // Pratinjau lokal; berkasnya baru diunggah saat Save Changes.
    setAvatarPreview(URL.createObjectURL(file))
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processAvatarFile(file)
  }

  const handleRemoveAvatar = () => {
    setPendingAvatar(null)
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const resetPasswordForm = () => {
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setShowNewPw(false)
    setShowConfirmPw(false)
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSaved(false)
    if (newPassword.length < 8) {
      setPasswordError('Password minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak sama.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(newPassword)
      setIsEditingPassword(false)
      resetPasswordForm()
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 4000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Gagal mengubah password.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSave = async () => {
    if (!isDirty || saveStatus === 'saving') return
    setSaveStatus('saving')
    setSaveError('')
    try {
      // Unggah foto baru ke Supabase Storage lebih dulu, lalu simpan URL-nya.
      let avatarUrl = avatarPreview
      if (pendingAvatar) {
        avatarUrl = await uploadAvatar(pendingAvatar)
      }
      await updateProfile({
        name: `${form.firstName} ${form.lastName}`.trim(),
        avatar_url: avatarUrl,
      })
      setProfile({ ...form })
      setSavedAvatar(avatarUrl)
      setAvatarPreview(avatarUrl)
      setPendingAvatar(null)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan profil.')
      setSaveStatus('error')
    }
  }

  const handleCancel = () => {
    setForm({ ...profile })
    setAvatarPreview(savedAvatar)
    setPendingAvatar(null)
    setSaveError('')
  }

  const handleLogout = async () => {
    setShowLogoutConfirm(false)
    await signOut()
    router.push('/signin')
    router.refresh()
  }

  const displayInitials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="min-h-screen w-full bg-[#141517] text-white flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* --- Header --- */}
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
            onClick={() => router.push('/home')}
            className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
            aria-label="Team"
          >
            <Users size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer"
            aria-label="Search"
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
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{displayInitials || '?'}</span>
              )}
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-52 bg-[#1b1c20] border border-neutral-800/90 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex flex-col items-center text-center p-2 pb-3 border-b border-neutral-800/80">
                    <div className="w-12 h-12 rounded-full border border-neutral-600 overflow-hidden bg-neutral-800 flex items-center justify-center mb-2">
                      {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base font-bold text-neutral-300">
                          {displayInitials || '?'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white tracking-tight">
                      {form.firstName} {form.lastName}
                    </p>
                    <p className="text-xs text-neutral-400 mt-0.5 truncate max-w-[180px]">
                      {form.email}
                    </p>
                  </div>

                  <div className="pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        router.push('/home')
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition cursor-pointer text-left"
                    >
                      <Home size={15} />
                      <span>Back to Home</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
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

      {/* --- Body --- */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-[#111214] border-r border-neutral-800/80 p-4 lg:min-h-[calc(100vh-4rem)] flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => router.push('/home')}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-800/40"
              >
                <Home size={18} strokeWidth={1.8} />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/home')}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-800/40"
              >
                <span>Favorites</span>
                <ChevronDown size={15} strokeWidth={1.8} />
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition bg-blue-600 text-white shadow-sm cursor-default"
              >
                <Settings size={18} strokeWidth={1.8} />
                <span>Profile Settings</span>
              </button>
            </nav>

            <div className="pt-2">
              <div className="flex items-center justify-between text-neutral-400 px-2 mb-3">
                <span className="text-sm font-medium text-neutral-300">Workspaces</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/home')}
                    className="hover:text-white transition cursor-pointer p-1"
                    aria-label="Options"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/home')}
                    className="hover:text-white transition cursor-pointer p-1"
                    aria-label="Search workspace"
                  >
                    <Search size={15} />
                  </button>
                </div>
              </div>
              <WorkspaceSelector />
            </div>
          </div>

          {/* Sidebar bottom */}
          <div className="pt-4 border-t border-neutral-800/60 mt-4">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            >
              <LogOut size={18} strokeWidth={1.8} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 sm:p-8 lg:p-8 flex flex-col min-w-0 bg-[#121316] overflow-y-auto">
          {/* Header Back Button & Page Title */}
          <div className="flex items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="inline-flex items-center gap-3 text-white hover:text-neutral-300 transition text-2xl sm:text-[26px] font-bold tracking-tight cursor-pointer"
            >
              <ArrowLeft size={22} className="text-neutral-400" />
              <span>My Profile</span>
            </button>
          </div>

          {loadError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {/* Full Screen Outer Box Container */}
          <div className="w-full flex-1 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 lg:p-10 bg-[#131417] flex flex-col justify-between shadow-sm min-h-[580px]">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Loader2 size={16} className="animate-spin" /> Memuat profil…
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSave()
                }}
                className="w-full flex flex-col h-full space-y-8"
              >
                {/* Your Photo Section */}
                <div className="space-y-3">
                  <h2 className="text-xs font-normal text-neutral-400">Your Photo</h2>
                  <div className="flex flex-row items-center gap-6">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-neutral-700/90 bg-[#212226] flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition shrink-0 group relative"
                    >
                      {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User
                          size={52}
                          strokeWidth={1}
                          className="text-neutral-500 group-hover:text-neutral-300 transition"
                        />
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-neutral-200 py-1 text-center opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                        <Camera size={11} /> Ganti
                      </span>
                    </div>

                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition cursor-pointer block"
                      >
                        Upload an Image File
                      </button>
                      <p className="text-xs text-neutral-500 max-w-md">
                        Foto profil memudahkan tim mengenali Anda. Maksimal 2 MB.
                      </p>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-xs text-red-400 hover:text-red-300 transition cursor-pointer mt-1 block"
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* Form Fields: 2 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 w-full">
                  {/* Column 1: Your Name */}
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-xs font-normal text-neutral-400 block">
                      Your Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={(e) => handleFieldChange('firstName', e.target.value)}
                      placeholder="Nama depan"
                      className="w-full h-11 px-4 bg-[#191a1e] border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition"
                    />
                  </div>

                  {/* Column 2: Last Name */}
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-xs font-normal text-neutral-400 block">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={(e) => handleFieldChange('lastName', e.target.value)}
                      placeholder="Nama belakang"
                      className="w-full h-11 px-4 bg-[#191a1e] border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition"
                    />
                  </div>

                  {/* Column 1: Email (read-only) */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-normal text-neutral-400 block">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      readOnly
                      className="w-full h-11 px-4 bg-[#17181c] border border-neutral-800 rounded-xl text-sm text-neutral-400 cursor-not-allowed focus:outline-none"
                    />
                    <p className="text-[11px] text-neutral-600">
                      Email terhubung ke akun login dan tidak bisa diubah di sini.
                    </p>
                  </div>

                  {/* Column 2: Role (read-only) */}
                  <div className="space-y-2">
                    <label htmlFor="role" className="text-xs font-normal text-neutral-400 block">
                      Role
                    </label>
                    <input
                      id="role"
                      type="text"
                      value={form.role}
                      readOnly
                      className="w-full h-11 px-4 bg-[#17181c] border border-neutral-800 rounded-xl text-sm text-neutral-400 cursor-not-allowed focus:outline-none"
                    />
                    <p className="text-[11px] text-neutral-600">
                      Role diatur oleh Project Manager.
                    </p>
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-3 border-t border-neutral-800/70 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xs font-normal text-neutral-400">Password</h2>
                      <p className="text-[11px] text-neutral-600 mt-1">
                        {passwordSaved
                          ? 'Password berhasil diperbarui.'
                          : 'Gunakan minimal 8 karakter.'}
                      </p>
                    </div>
                    {!isEditingPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPassword(true)
                          setPasswordSaved(false)
                          resetPasswordForm()
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition cursor-pointer"
                      >
                        <Lock size={13} />
                        <span>Change password</span>
                      </button>
                    )}
                  </div>

                  {isEditingPassword && (
                    <div className="space-y-3 rounded-xl border border-neutral-800/80 bg-[#191a1e] p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="relative">
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            autoFocus
                            className="w-full h-11 pl-4 pr-11 bg-[#141517] border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
                            aria-label={showNewPw ? 'Hide password' : 'Show password'}
                          >
                            {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showConfirmPw ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full h-11 pl-4 pr-11 bg-[#141517] border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPw((v) => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
                            aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                          >
                            {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {passwordError && (
                        <p className="flex items-center gap-1.5 text-xs text-red-400">
                          <AlertCircle size={13} /> {passwordError}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPassword(false)
                            resetPasswordForm()
                          }}
                          className="px-3 py-2 text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handlePasswordChange}
                          disabled={savingPassword || !newPassword || !confirmPassword}
                          className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition cursor-pointer"
                        >
                          {savingPassword && <Loader2 size={13} className="animate-spin" />}
                          {savingPassword ? 'Menyimpan…' : 'Simpan Password'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex items-center gap-3 mt-auto">
                  <button
                    type="submit"
                    disabled={saveStatus === 'saving' || !isDirty}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>

                  {isDirty && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2.5 text-xs font-medium text-neutral-400 hover:text-white transition cursor-pointer"
                    >
                      Discard
                    </button>
                  )}

                  {saveStatus === 'error' && saveError && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                      <AlertCircle size={13} /> {saveError}
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        </main>
      </div>

      {/* Success toast */}
      {saveStatus === 'saved' && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-2.5 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
          <Check size={16} />
          Profil berhasil disimpan.
        </div>
      )}

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm logout"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-[#191a1e] border border-neutral-800/80 rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <LogOut size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Log Out</h3>
                <p className="text-xs text-neutral-400">Are you sure you want to sign out?</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
