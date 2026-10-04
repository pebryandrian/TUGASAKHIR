'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check, Circle } from 'lucide-react'

interface AuthPageProps {
  initialMode?: 'signup' | 'login' | 'forgot'
}

export default function AuthPage({ initialMode = 'signup' }: AuthPageProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'login' | 'forgot'>(initialMode)
  const [isExiting, setIsExiting] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Login form state
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const m = params.get('mode')
      if (m === 'login' || m === 'forgot' || m === 'signup') {
        setMode(m)
      }
    }
  }, [])

  // Password validation checks
  const isMin14 = password.length >= 14
  const hasMixedChars =
    /[0-9]/.test(password) &&
    /[a-zA-Z]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)

  const handleBackHome = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isExiting) return
    setIsExiting(true)
    setTimeout(() => {
      router.push('/')
    }, 650)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if ((mode === 'signup' || mode === 'forgot') && password !== confirmPassword) {
      alert('Passwords do not match!')
      setIsLoading(false)
      return
    }

    setTimeout(() => {
      setIsLoading(false)
      if (mode === 'signup' || mode === 'login') {
        router.push('/home')
      } else {
        alert(`New password set successfully for ${email}! Please log in.`)
        setMode('login')
      }
    }, 400)
  }

  return (
    <main className="w-full min-h-screen lg:h-screen lg:max-h-screen bg-[#111214] text-white flex flex-col lg:flex-row overflow-x-hidden lg:overflow-hidden selection:bg-neutral-700 selection:text-white p-0 m-0 relative">
      {/* Background fade for return animation */}
      <div
        className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-600 ease-out z-0 ${
          isExiting ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Left Side: Dark Branding Column */}
      <section
        className={`w-full lg:w-1/2 h-full flex flex-col justify-between pt-6 sm:pt-8 lg:pt-10 pb-3 lg:pb-4 relative bg-[#111214] transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] z-10 ${
          isExiting ? 'opacity-0 -translate-x-6' : 'opacity-100 translate-x-0'
        }`}
      >
        {/* Logo */}
        <header className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
          <button
            type="button"
            onClick={handleBackHome}
            className="inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
            aria-label="Back to INVISUAL Home"
          >
            <Image
              src="/images/logo/logo1.png"
              alt="INVISUAL"
              width={160}
              height={32}
              priority
              className="h-6 sm:h-7 md:h-8 w-auto object-contain brightness-0 invert"
            />
          </button>
        </header>

        {/* Main Title & Tagline */}
        <div className="my-auto py-6 sm:py-8 lg:py-10 px-6 sm:px-10 lg:px-14 xl:px-16 max-w-xl">
          <h1 className="text-4xl sm:text-5xl lg:text-[54px] xl:text-[60px] font-bold text-white tracking-tight leading-[1.12]">
            Welcome to the <br />
            Project Hub
          </h1>
          <p className="mt-4 text-base sm:text-lg lg:text-xl font-normal text-neutral-300">
            Design. Manage. Deploy.
          </p>
        </div>

        {/* Bottom Illustration & Description */}
        <div className="w-full mt-auto flex flex-col items-center">
          <div className="w-full pointer-events-none select-none overflow-hidden leading-none">
            <Image
              src="/hero.png"
              alt="Invisual Team Characters"
              width={769}
              height={250}
              priority
              className="w-full h-auto object-cover object-bottom block"
            />
          </div>
          <p className="mt-3 text-xs sm:text-sm text-neutral-400 text-center tracking-normal font-normal px-4">
            A web-based solution for collaborative workflow management
          </p>
        </div>
      </section>

      {/* Right Side: Full Screen White Panel */}
      <section
        className={`w-full lg:w-1/2 h-full min-h-screen lg:min-h-0 bg-white text-neutral-900 rounded-t-[32px] lg:rounded-t-none lg:rounded-l-[44px] flex items-center justify-center px-6 sm:px-12 lg:px-14 xl:px-16 py-8 sm:py-10 lg:py-8 overflow-y-auto z-20 shadow-2xl transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExiting ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="w-full max-w-[460px] mx-auto my-auto">
          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight mb-7 sm:mb-8">
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'login' && 'Hi, Welcome Back!'}
            {mode === 'forgot' && 'Set Your New Password'}
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            {mode === 'signup' && (
              <div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  required
                  className="w-full h-11 px-4 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                />
              </div>
            )}

            <div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full h-11 px-4 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              />
            </div>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full h-11 pl-4 pr-11 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
              </button>
            </div>

            {/* Password Requirements in Sign Up & Forgot Password Modes */}
            {(mode === 'signup' || mode === 'forgot') && (
              <div className="pt-1 pb-1 space-y-1.5 text-xs">
                <p className="font-semibold text-neutral-800">
                  Passowrd must contains :
                </p>
                <div className="flex items-center gap-2">
                  {isMin14 ? (
                    <Check size={14} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <Circle size={11} className="text-neutral-600 shrink-0" />
                  )}
                  <span className={isMin14 ? 'text-emerald-700 font-medium' : 'text-neutral-700 font-normal'}>
                    Minimum 14 Character
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasMixedChars ? (
                    <Check size={14} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
                  ) : (
                    <Circle size={11} className="text-neutral-600 shrink-0" />
                  )}
                  <span className={hasMixedChars ? 'text-emerald-700 font-medium' : 'text-neutral-700 font-normal'}>
                    Combine numbers, words, and symbols
                  </span>
                </div>
              </div>
            )}

            {(mode === 'signup' || mode === 'forgot') && (
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  required
                  className="w-full h-11 pl-4 pr-11 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>
            )}

            {/* Login-specific Remember Me & Forgot Password */}
            {mode === 'login' && (
              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-neutral-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 accent-neutral-900 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:underline transition cursor-pointer"
                >
                  Forgot password
                </button>
              </div>
            )}

            {/* Primary Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                style={{ color: '#ffffff' }}
                className="w-full h-12 bg-[#131416] hover:bg-[#25282c] active:scale-[0.99] !text-white text-sm sm:text-base font-semibold rounded-xl shadow-md transition-all duration-200 flex items-center justify-center cursor-pointer disabled:opacity-70"
              >
                {isLoading
                  ? 'Processing...'
                  : mode === 'signup'
                  ? 'Create Account'
                  : mode === 'login'
                  ? 'Login'
                  : 'Create New Password'}
              </button>
            </div>
          </form>

          {/* Divider & Social Login - Only for Signup and Login modes */}
          {mode !== 'forgot' && (
            <>
              <div className="relative my-6 flex items-center justify-center">
                <div className="border-t border-neutral-200 w-full" />
                <span className="bg-white px-4 text-xs sm:text-sm text-neutral-400 absolute">
                  Or sign in with
                </span>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => router.push('/home')}
                  className="w-full h-12 border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50/80 active:scale-[0.99] text-neutral-700 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer shadow-xs"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
            </>
          )}

          {/* Mode Toggle Prompts */}
          <div className="text-center mt-6 text-sm text-neutral-600">
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Log In
                </button>
              </p>
            )}

            {mode === 'login' && (
              <p>
                Dont have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p>
                Remember it?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Login
                </button>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
