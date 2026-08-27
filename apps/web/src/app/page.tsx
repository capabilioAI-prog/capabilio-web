'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles, TrendingUp, Compass, Cpu, Swords } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

import { LandingHeader } from '@/components/landing/landing-header';
import { LandingBackgroundGrid } from '@/components/landing/landing-background-grid';
import { LandingHeroCard } from '@/components/landing/landing-hero-card';
import { LandingLiveArenaDemo } from '@/components/landing/landing-live-arena-demo';
import { LandingResumeVsProof } from '@/components/landing/landing-resume-vs-proof';
import { LandingCareerLoop } from '@/components/landing/landing-career-loop';
import { LandingSkillStudioPreview } from '@/components/landing/landing-skill-studio-preview';
import { LandingArenaWorkstation } from '@/components/landing/landing-arena-workstation';
import { LandingAuraPreview } from '@/components/landing/landing-aura-preview';
import { LandingPortfolioBranding } from '@/components/landing/landing-portfolio-branding';
import { LandingAiInterviewPreview } from '@/components/landing/landing-ai-interview-preview';
import { LandingLaunchpadPulse } from '@/components/landing/landing-launchpad-pulse';
import { LandingStudentAndFourJourneys } from '@/components/landing/landing-student-and-four-journeys';
import { LandingEloPricingTrust } from '@/components/landing/landing-elo-pricing-trust';
import { LandingFooter } from '@/components/landing/landing-footer';

export default function LandingPage() {
  const { user, profile, isAuthenticated } = useAuth();

  const primaryHref = isAuthenticated
    ? user?.hasCompletedCareerOnboarding === false
      ? '/onboarding/career-calibration'
      : '/aura'
    : '/register';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-brand selection:text-white relative overflow-hidden">
      
      {/* Proprietary Subtle Career Intelligence Background Grid */}
      <LandingBackgroundGrid />

      {/* Global Navigation Header */}
      <LandingHeader />

      {/* 1. Hero Section: Living Career Proof */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 text-center z-10">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand/5 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-xs shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span className="text-xs font-mono font-medium text-muted-foreground">
              Career Operating System • AI-Powered Work Simulation
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            DON&apos;T GRADUATE WITH A RESUME. <br />
            <span className="text-brand">GRADUATE WITH PROOF.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-sans">
            Capabilio turns learning into demonstrated capability — through role-specific work, measurable performance, evidence, and career intelligence.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              href={primaryHref}
              className="px-8 py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold font-mono shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <span>{isAuthenticated ? 'CONTINUE YOUR CAREER OS →' : 'BUILD MY CAREER PROOF →'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#arena-demo"
              className="px-6 py-3.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold font-mono transition-colors flex items-center gap-1.5"
            >
              <Swords className="w-4 h-4 text-brand" />
              <span>SEE ARENA SIMULATION</span>
            </a>
          </div>

          {/* Living Career Proof Console with Hero Role Switcher */}
          <div className="pt-8">
            <LandingHeroCard />
          </div>

        </div>
      </section>

      {/* 2. Interactive Live Arena Demonstration (Workstation Sandbox) */}
      <LandingLiveArenaDemo />

      {/* 3. Core Differentiator: Traditional Resume Claims vs. Capabilio Evidence */}
      <LandingResumeVsProof />

      {/* 4. The Capabilio Career Loop: Learn -> Practice -> Perform -> Prove -> Get Hired -> Improve */}
      <LandingCareerLoop />

      {/* 5. Skill Studio: Know Exactly What Your Career Requires */}
      <LandingSkillStudioPreview />

      {/* 6. Arena Workstations: The Job is the Classroom (9-Role Showcase) */}
      <LandingArenaWorkstation />

      {/* 7. Aura: Continuous Career Intelligence & ELO */}
      <LandingAuraPreview />

      {/* 8. AI Live Work Interviews: Don't Just Answer Questions. Work Through the Interview. */}
      <LandingAiInterviewPreview />

      {/* 9. Living Vault & Personal Branding Story */}
      <LandingPortfolioBranding />

      {/* 9. Launchpad (Evidence-Matched Jobs) & Pulse (Career Signals Feed) */}
      <LandingLaunchpadPulse />

      {/* 10. 7-Step Student Journey (400 Baseline ELO) & Four Ecosystems */}
      <LandingStudentAndFourJourneys />

      {/* 11. ELO Progression, Dynamic Pricing & Final Call to Action */}
      <LandingEloPricingTrust />

      {/* 12. Complete Footer & Sitemap */}
      <LandingFooter />

    </div>
  );
}
