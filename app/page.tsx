'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'

export default function Page() {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleStartTransition = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      router.push('/signin')
    }, 700)
  }

  return (
    <main className="min-h-screen w-full relative flex flex-col justify-between bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white overflow-hidden p-0 m-0">
      {/* Dark background overlay that fades in during transition */}
      <div
        className={`absolute inset-0 bg-[#111214] pointer-events-none transition-opacity duration-600 ease-out z-0 ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 sm:px-10 md:px-14 lg:px-20 py-5 sm:py-6 relative z-30">
        <a href="/" className="inline-flex items-center" aria-label="INVISUAL Home">
          <Image
            src="/images/logo/logo1.png"
            alt="INVISUAL"
            width={160}
            height={32}
            priority
            className={`h-6 sm:h-7 md:h-8 w-auto object-contain transition-all duration-500 ${
              isTransitioning ? 'brightness-0 invert' : ''
            }`}
          />
        </a>

        <button
          type="button"
          onClick={handleStartTransition}
          className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 border border-neutral-900 rounded-lg text-xs sm:text-sm font-semibold text-neutral-900 hover:bg-neutral-900 hover:text-white transition-all duration-300 cursor-pointer ${
            isTransitioning ? 'opacity-0 pointer-events-none translate-x-4' : 'opacity-100'
          }`}
        >
          <UserPlus size={16} strokeWidth={2} aria-hidden="true" />
          <span>Sign Up</span>
        </button>
      </header>

      {/* Hero Copy (Fades out and floats up during transition) */}
      <section
        className={`flex-1 flex flex-col items-center justify-center text-center px-4 pt-2 sm:pt-4 pb-4 relative z-10 transition-all duration-400 ease-in ${
          isTransitioning
            ? 'opacity-0 -translate-y-8 scale-95 pointer-events-none'
            : 'opacity-100 translate-y-0 scale-100'
        }`}
      >
        <h1 className="text-3xl sm:text-5xl md:text-[52px] lg:text-[58px] font-bold text-[#1f2421] tracking-tight leading-[1.12] max-w-4xl">
          Integrated Project <br />
          Content Management System
        </h1>
        <p className="mt-3.5 sm:mt-4 text-sm sm:text-base md:text-lg text-neutral-600 max-w-2xl font-normal">
          A web-based solution for collaborative workflow management
        </p>
        <div className="mt-6 sm:mt-7">
          <button
            type="button"
            onClick={handleStartTransition}
            style={{ color: '#ffffff' }}
            className="inline-flex items-center justify-center px-8 py-3 bg-[#131416] hover:bg-[#232629] !text-white text-sm sm:text-base font-semibold rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.35)] hover:shadow-[0_14px_30px_-4px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* Left side text that fades in during transition */}
      <div
        className={`absolute left-0 top-[28%] px-6 sm:px-10 lg:px-14 xl:px-16 max-w-xl z-20 pointer-events-none transition-all duration-600 delay-150 ease-out ${
          isTransitioning
            ? 'opacity-100 translate-x-0'
            : 'opacity-0 -translate-x-8'
        }`}
      >
        <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold text-white tracking-tight leading-[1.12]">
          Welcome to the <br />
          Project Hub
        </h1>
        <p className="mt-4 text-base sm:text-lg font-normal text-neutral-300">
          Design. Manage. Deploy.
        </p>
      </div>

      {/* Sliding white panel on the right side */}
      <div
        className={`fixed top-0 right-0 w-full lg:w-1/2 h-full bg-white z-20 rounded-t-[32px] lg:rounded-t-none lg:rounded-l-[44px] shadow-2xl transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
          isTransitioning ? 'translate-x-0' : 'translate-x-full'
        }`}
      />

      {/* Bottom Hero Illustration - Shrinks and moves to bottom-left */}
      <div
        className="w-full mt-auto flex items-end pointer-events-none select-none overflow-hidden leading-none relative z-10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom-left"
        style={{
          transform: isTransitioning
            ? 'scale(0.5) translate(0px, 0px)'
            : 'scale(1) translate(0px, 0px)',
        }}
      >
        <Image
          src="/hero.png"
          alt="Invisual Team Illustration"
          width={1920}
          height={624}
          priority
          sizes="100vw"
          className="w-full h-auto object-cover object-bottom block"
        />
      </div>

      {/* Caption under cartoon during transition */}
      <div
        className={`w-full lg:w-1/2 absolute bottom-2 left-0 text-center pointer-events-none z-10 transition-opacity duration-500 delay-300 ${
          isTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-xs sm:text-sm text-neutral-400 font-normal px-4">
          A web-based solution for collaborative workflow management
        </p>
      </div>
    </main>
  )
}
