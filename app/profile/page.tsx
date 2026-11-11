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
  ChevronLeft,
  Camera,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  User,
  Shield,
  LogOut,
} from 'lucide-react'
import { WorkspaceSelector } from '@/components/workspace-selector'
import { getSessionProfile, updateProfile, changePassword } from '@/lib/db'
import { signOut } from '@/lib/auth'

type Role = 'Team Member' | 'Project Manager' | 'Admin' | 'Owner' | 'None Member'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface ProfileData {
  firstName: string
  lastName: string
  jobTitle: string
  email: string
  password: string
  role: Role
  bio: string
  avatarUrl: string | null
}

const ROLES: Role[] = ['Team Member', 'Project Manager', 'Admin', 'Owner']

const initialProfile: ProfileData = {
  firstName: 'George',
  lastName: 'Frederic',
  jobTitle: '',
  email: 'george@example.com',
  password: 'mysecurepassword',
  role: 'Team Member',
  bio: '',
  avatarUrl: null,
}

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeNav, setActiveNav] = useState('Home')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const [profile, setProfile] = useState<ProfileData>(initialProfile)
  const [form, setForm] = useState<ProfileData>(initialProfile)
  const [showPassword, setShowPassword] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [savedAvatar, setSavedAvatar] = useState<string | null>(null)
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const isDirty =
    JSON.stringify(form) !== JSON.stringify(profile) ||
    avatarPreview !== savedAvatar

  // Load the signed-in user's profile from Supabase.
  useEffect(() => {
    getSessionProfile().then((p) => {
      if (!p) return
      const [firstName, ...rest] = p.name.split(' ')
      const loaded: ProfileData = {
        firstName,
        lastName: rest.join(' '),
        jobTitle: '',
        email: p.email,
        password: '',
        role: p.role === 'project_manager' ? 'Project Manager' : 'Team Member',
        bio: '',
        avatarUrl: p.avatar_url,
      }
      setProfile(loaded)
      setForm(loaded)
      setSavedAvatar(p.avatar_url)
      setAvatarPreview(p.avatar_url)
    })
  }, [])

  const handleFieldChange = (field: keyof ProfileData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const processAvatarFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processAvatarFile(file)
  }

  const handleAvatarDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingAvatar(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processAvatarFile(file)
  }

  const handleAvatarDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingAvatar(true)
  }

  const handleAvatarDragLeave = () => setIsDraggingAvatar(false)

  const handleRemoveAvatar = () => {
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    try {
      await changePassword(newPassword)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.')
      return
    }
    setForm(prev => ({ ...prev, password: newPassword }))
    setNewPassword('')
    setConfirmPassword('')
    setIsEditingPassword(false)
  }

  const handleSave = async () => {
    if (!isDirty) return
    setSaveStatus('saving')
    try {
      await updateProfile({
        name: `${form.firstName} ${form.lastName}`.trim(),
        avatar_url: avatarPreview,
      })
      setProfile({ ...form })
      setSavedAvatar(avatarPreview)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    }
  }

  const handleCancel = () => {
    setForm({ ...profile })
    setAvatarPreview(savedAvatar)
    setIsEditingPassword(false)
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
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
          <button type="button" className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer" aria-label="Notifications">
            <Bell size={18} strokeWidth={1.8} />
          </button>
          <button type="button" className="p-2 hover:text-white hover:bg-neutral-800/60 rounded-lg transition cursor-pointer" aria-label="Team">
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
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{displayInitials}</span>
              )}
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
                      {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base font-bold text-neutral-300">{displayInitials}</span>
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
                        router.push('/profile')
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition cursor-pointer text-left"
                    >
                      <Settings size={15} />
                      <span>Profile Settings</span>
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
                onClick={() => { setActiveNav('Home'); router.push('/home') }}
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
            </nav>

            <div className="pt-2">
              <div className="flex items-center justify-between text-neutral-400 px-2 mb-3">
                <span className="text-sm font-medium text-neutral-300">Workspaces</span>
                <div className="flex items-center gap-2">
                  <button type="button" className="hover:text-white transition cursor-pointer p-1" aria-label="Options">
                    <MoreHorizontal size={16} />
                  </button>
                  <button type="button" className="hover:text-white transition cursor-pointer p-1" aria-label="Search workspace">
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
        {/* Main Content Area - Full width filling the screen */}
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

          {/* Full Screen Outer Box Container matching screenshot */}
          <div className="w-full flex-1 border border-neutral-800/80 rounded-2xl p-6 sm:p-8 lg:p-10 bg-[#131417] flex flex-col justify-between shadow-sm min-h-[580px]">
            <form onSubmit={e => { e.preventDefault(); handleSave() }} className="w-full flex flex-col h-full space-y-8">
              {/* Your Photo Section */}
              <div className="space-y-3">
                <h2 className="text-xs font-normal text-neutral-400">Your Photo</h2>
                <div className="flex flex-row items-center gap-6">
                  {/* Round Avatar Container */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-neutral-700/90 bg-[#212226] flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition shrink-0 group relative"
                  >
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={52} strokeWidth={1} className="text-neutral-500 group-hover:text-neutral-300 transition" />
                    )}
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
                      Profile photos make it easier for your team to identify you in the workspace.
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
                    onChange={e => handleFieldChange('firstName', e.target.value)}
                    placeholder="George"
                    className="w-full h-11 px-4 bg-[#191a1e] border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition"
                  />
                </div>

                {/* Column 2: Job Title */}
                <div className="space-y-2">
                  <label htmlFor="jobTitle" className="text-xs font-normal text-neutral-400 block">
                    Job Title
                  </label>
                  <input
                    id="jobTitle"
                    type="text"
                    value={form.jobTitle}
                    onChange={e => handleFieldChange('jobTitle', e.target.value)}
                    placeholder=""
                    className="w-full h-11 px-4 bg-[#191a1e] border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition"
                  />
                </div>

                {/* Column 1: Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-normal text-neutral-400 block">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={e => handleFieldChange('email', e.target.value)}
                    placeholder="george@example.com"
                    className="w-full h-11 px-4 bg-[#191a1e] border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition"
                  />
                </div>

                {/* Column 2: Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-normal text-neutral-400 block">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => handleFieldChange('password', e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-11 pl-4 pr-11 bg-[#191a1e] border border-neutral-800 rounded-xl text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Column 1: Role */}
                <div className="space-y-2">
                  <label htmlFor="role" className="text-xs font-normal text-neutral-400 block">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      value={form.role}
                      onChange={e => handleFieldChange('role', e.target.value as Role)}
                      className="w-full h-11 px-4 pr-10 bg-[#191a1e] border border-neutral-800 rounded-xl text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 transition appearance-none cursor-pointer"
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role} className="bg-[#191a1e] text-white">
                          {role}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center gap-3 mt-auto">
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-60"
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
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Success toast */}
      {saveStatus === 'saved' && !isDirty && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-2.5 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
          <Check size={16} />
          Profile saved successfully!
        </div>
      )}

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Confirm logout">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
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
