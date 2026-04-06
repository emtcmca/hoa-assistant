'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Navbar from './components/homepage/Navbar'
import HeroSection from './components/homepage/HeroSection'
import TrustStrip from './components/homepage/TrustStrip'
import StatBand from './components/homepage/StatBand'
import HowItWorksSection from './components/homepage/HowItWorksSection'
import AudienceSection from './components/homepage/AudienceSection'
import DemoSection from './components/homepage/DemoSection'
import FinalCTA from './components/homepage/FinalCTA'
import Footer from './components/homepage/Footer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      }
    })
  }, [router])

  return (
    <main style={{ background: 'var(--bg)' }}>
      <Navbar />
      <HeroSection />
      <TrustStrip />
      <StatBand />
      <HowItWorksSection />
      <AudienceSection />
      <DemoSection />
      <FinalCTA />
      <Footer />
    </main>
  )
}