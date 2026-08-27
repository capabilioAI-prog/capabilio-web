'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Check, 
  Minus, 
  ArrowRight, 
  ShieldCheck, 
  Award, 
  Sparkles, 
  Swords, 
  Brain, 
  Video, 
  Layers, 
  Zap, 
  Compass 
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useEntitlements } from '@/lib/entitlements-context';
import { STUDENT_PLANS, ADDON_PRICING, StudentPlanTier, BillingCycle } from '@capabilio/types';

export function LandingEloPricingTrust() {
  const { isAuthenticated } = useAuth();
  const { plan: currentPlan, upgradePlan, openUpgradeModal } = useEntitlements();

  const [audienceTab, setAudienceTab] = useState<'student' | 'professional' | 'college'>('student');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [showComparison, setShowComparison] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const handlePlanAction = async (targetPlan: StudentPlanTier) => {
    if (!isAuthenticated) {
      window.location.href = '/register';
      return;
    }

    if (targetPlan === currentPlan) {
      window.location.href = '/aura';
      return;
    }

    setUpgradingPlan(targetPlan);
    await upgradePlan(targetPlan, billingCycle);
    setUpgradingPlan(null);
  };

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-24">
      
      {/* 1. ELO Capability Metric Showcase */}
      <div className="space-y-8 text-center">
        <div className="space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
            CALIBRATED CAPABILITY METRIC
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            A number that represents what you&apos;ve actually done.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed font-sans">
            Every meaningful submission in Arena changes your career evidence. Capabilio ELO is a living measurement of demonstrated technical competence starting at 400 baseline.
          </p>
        </div>

        {/* ELO Progression Stepper */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-lg max-w-4xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground font-semibold block">BASELINE</span>
              <span className="text-lg font-bold font-mono text-foreground">400</span>
              <span className="text-[9px] font-mono text-muted-foreground block">Student Start</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground font-semibold block">CALIBRATION</span>
              <span className="text-lg font-bold font-mono text-foreground">428</span>
              <span className="text-[9px] font-mono text-emerald-600 block">+28 Assessment</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground font-semibold block">SPRINT 1</span>
              <span className="text-lg font-bold font-mono text-foreground">440</span>
              <span className="text-[9px] font-mono text-emerald-600 block">+12 Auth Fix</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground font-semibold block">SPRINT 2</span>
              <span className="text-lg font-bold font-mono text-foreground">458</span>
              <span className="text-[9px] font-mono text-emerald-600 block">+18 Rate Limit</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1">
              <span className="text-[10px] font-mono text-muted-foreground font-semibold block">INTERVIEW</span>
              <span className="text-lg font-bold font-mono text-foreground">485</span>
              <span className="text-[9px] font-mono text-emerald-600 block">+27 AI Session</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-brand/10 border border-brand/40 space-y-1 shadow-md">
              <span className="text-[10px] font-mono text-brand font-bold block">HIRE-READY</span>
              <span className="text-lg font-bold font-mono text-brand">520+</span>
              <span className="text-[9px] font-mono text-brand font-semibold block">Launchpad Direct</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Production Pricing Section */}
      <div id="pricing" className="space-y-12 text-center">
        
        {/* Header Copy */}
        <div className="space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
            TRANSPARENT PRODUCTION PRICING
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Choose how seriously you want to build your career.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
            Start free. Build proof. Upgrade when you need more practice, intelligence, and career acceleration.
          </p>
        </div>

        {/* Audience Selector & Billing Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          
          {/* Audience Tabs */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-muted/60 border border-border">
            {(['student', 'professional', 'college'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setAudienceTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold capitalize transition-all ${
                  audienceTab === tab 
                    ? 'bg-card text-foreground shadow-sm border border-border' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'student' ? 'Student Plans' : tab === 'professional' ? 'Professional' : 'College Campus'}
              </button>
            ))}
          </div>

          {/* Billing Cycle Toggle (Monthly vs Annual) */}
          {audienceTab === 'student' && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-muted/40 border border-border text-xs font-mono">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1 rounded-xl transition-all ${
                  billingCycle === 'monthly' ? 'bg-brand text-white font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 ${
                  billingCycle === 'annual' ? 'bg-brand text-white font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-semibold">SAVE ~16%</span>
              </button>
            </div>
          )}

        </div>

        {/* STUDENT PRICING CARDS */}
        {audienceTab === 'student' && (
          <div className="space-y-12">
            
            {/* 3 Main Pricing Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left max-w-6xl mx-auto items-stretch">
              
              {/* 1. FREE PLAN */}
              <div className="p-7 sm:p-8 rounded-3xl border border-border bg-card shadow-sm flex flex-col justify-between space-y-6 hover:border-border/80 transition-all">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-extrabold font-mono text-foreground">FREE</h3>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Start building your skills, portfolio, and career profile.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-black font-mono text-foreground">
                      ₹0 <span className="text-xs font-normal text-muted-foreground">/ month</span>
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">100% Free Forever</div>
                  </div>

                  {/* Career Capacity Box */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Career Capacity</span>
                      <span className="font-bold text-foreground">1 Arena task / day</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">Daily reset at 12:00 AM IST</div>
                  </div>

                  {/* Key Features */}
                  <div className="space-y-2.5 pt-1">
                    <div className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">Included:</div>
                    <ul className="space-y-2 text-xs font-mono text-muted-foreground">
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Basic profile & sharing</span>
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Limited skill tracking & graph</span>
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Basic portfolio & evidence</span>
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Basic job & internship discovery</span>
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Basic opportunity browsing</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => handlePlanAction('free')}
                    className="w-full py-3.5 rounded-xl border border-border hover:bg-muted text-foreground font-bold font-mono text-xs transition-colors text-center block"
                  >
                    {isAuthenticated && currentPlan === 'free' ? 'CURRENT PLAN' : 'START FREE'}
                  </button>
                </div>
              </div>

              {/* 2. PRO PLAN (MOST POPULAR) */}
              <div className="p-7 sm:p-8 rounded-3xl border-2 border-brand bg-gradient-to-b from-card via-card to-brand/5 shadow-2xl flex flex-col justify-between space-y-6 relative hover:scale-[1.01] transition-transform">
                
                {/* Most Popular Badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-brand text-white text-[10px] font-mono font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>MOST POPULAR</span>
                </div>

                <div className="space-y-5">
                  <div className="space-y-1.5 pt-1">
                    <h3 className="text-xl font-extrabold font-mono text-brand">PRO</h3>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Prepare seriously for internships and placements with structured practice and feedback.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-black font-mono text-foreground">
                      {billingCycle === 'annual' ? '₹2,999' : '₹299'} 
                      <span className="text-xs font-normal text-muted-foreground">
                        {billingCycle === 'annual' ? ' / year' : ' / month'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-brand font-semibold">
                      {billingCycle === 'annual' ? '₹249/mo billed annually' : 'Billed monthly • Cancel anytime'}
                    </div>
                  </div>

                  {/* Career Capacity Box */}
                  <div className="p-3 rounded-2xl bg-brand/10 border border-brand/30 space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-brand font-bold">Career Capacity</span>
                      <span className="font-extrabold text-foreground">3 Arena tasks / day</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">3 AI interviews + 1 Skill report/mo</div>
                  </div>

                  {/* Key Features */}
                  <div className="space-y-2.5 pt-1">
                    <div className="text-[11px] font-mono text-brand uppercase font-semibold">Everything in Free, plus:</div>
                    <ul className="space-y-2 text-xs font-mono text-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-brand shrink-0" />
                        <span><strong>3 Arena tasks per day</strong> (IST reset)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-brand shrink-0" />
                        <span><strong>1 monthly skill report</strong> & diagnostics</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-brand shrink-0" />
                        <span><strong>3 AI interview sessions</strong> / month</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-brand shrink-0" />
                        <span>Internship readiness score & tracking</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-brand shrink-0" />
                        <span>1 monthly market analysis report</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-brand shrink-0" />
                        <span>Interview feedback & improvement areas</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    disabled={upgradingPlan === 'pro'}
                    onClick={() => handlePlanAction('pro')}
                    className="w-full py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-extrabold font-mono text-xs shadow-lg shadow-brand/25 transition-all text-center block hover:scale-[1.02]"
                  >
                    {isAuthenticated && currentPlan === 'pro' 
                      ? 'ACTIVE PRO PLAN' 
                      : upgradingPlan === 'pro' 
                        ? 'UPGRADING...' 
                        : 'GO PRO →'}
                  </button>
                </div>
              </div>

              {/* 3. ELITE PLAN */}
              <div className="p-7 sm:p-8 rounded-3xl border border-border bg-gradient-to-b from-card via-card to-muted/30 shadow-md flex flex-col justify-between space-y-6 hover:border-brand/50 transition-all">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-extrabold font-mono text-foreground">ELITE</h3>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        MAX ACCELERATION
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                      Build stronger evidence, improve faster, and present yourself professionally.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl sm:text-4xl font-black font-mono text-foreground">
                      {billingCycle === 'annual' ? '₹4,999' : '₹499'} 
                      <span className="text-xs font-normal text-muted-foreground">
                        {billingCycle === 'annual' ? ' / year' : ' / month'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-600 font-semibold">
                      BEST FOR SERIOUS CAREER BUILDING
                    </div>
                  </div>

                  {/* Career Capacity Box */}
                  <div className="p-3 rounded-2xl bg-muted/60 border border-border space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-foreground font-semibold">Career Capacity</span>
                      <span className="font-extrabold text-brand">6 Arena tasks / day</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">5 AI interviews + 2 Skill reports/mo</div>
                  </div>

                  {/* Key Features */}
                  <div className="space-y-2.5 pt-1">
                    <div className="text-[11px] font-mono text-muted-foreground uppercase font-semibold">Everything in Free & Pro, plus:</div>
                    <ul className="space-y-2 text-xs font-mono text-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span><strong>6 Arena tasks per day</strong> (IST reset)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span><strong>2 monthly skill reports</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span><strong>5 AI interview sessions</strong> / month</span>
                      </li>
                      <li className="flex items-center gap-2 text-brand font-semibold">
                        <Video className="w-4 h-4 text-brand shrink-0" />
                        <span><strong>Personal branding video</strong> (Included)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span><strong>2 monthly market analysis reports</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Priority access & Elite profile badge</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    disabled={upgradingPlan === 'elite'}
                    onClick={() => handlePlanAction('elite')}
                    className="w-full py-3.5 rounded-xl border-2 border-border hover:border-brand bg-card hover:bg-muted text-foreground font-bold font-mono text-xs transition-all text-center block hover:scale-[1.02]"
                  >
                    {isAuthenticated && currentPlan === 'elite' 
                      ? 'ACTIVE ELITE PLAN' 
                      : upgradingPlan === 'elite' 
                        ? 'UPGRADING...' 
                        : 'GO ELITE →'}
                  </button>
                </div>
              </div>

            </div>

            {/* Toggle Comparison Table Button */}
            <div className="pt-4">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="text-xs font-mono font-bold text-brand hover:underline inline-flex items-center gap-1.5"
              >
                <span>{showComparison ? 'Hide detailed feature comparison ↑' : 'View full plan comparison table →'}</span>
              </button>
            </div>

            {/* Compact Comparison Table */}
            {showComparison && (
              <div className="rounded-3xl border border-border bg-card shadow-xl overflow-hidden max-w-5xl mx-auto animate-fade-in text-left">
                <div className="p-6 border-b border-border/80 bg-muted/20">
                  <h4 className="text-base font-extrabold font-mono text-foreground">
                    Comprehensive Feature & Capacity Matrix
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Every capacity limit is strictly enforced on the server. Daily resets occur at 12:00 AM IST.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40">
                        <th className="py-3.5 px-6 font-bold text-foreground">Feature</th>
                        <th className="py-3.5 px-4 text-center font-bold text-foreground">Free</th>
                        <th className="py-3.5 px-4 text-center font-bold text-brand bg-brand/5">Pro (₹299/mo)</th>
                        <th className="py-3.5 px-4 text-center font-bold text-foreground">Elite (₹499/mo)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Basic Profile & Sharing</td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600 bg-brand/5"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Limited Skill Tracking & Graph</td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600 bg-brand/5"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Basic Portfolio & Evidence</td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600 bg-brand/5"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Basic Job & Internship Discovery</td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600 bg-brand/5"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                      </tr>
                      <tr className="bg-muted/20">
                        <td className="py-3 px-6 text-foreground font-bold">Arena Tasks Per Day (IST reset)</td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">1</td>
                        <td className="py-3 px-4 text-center font-bold text-brand bg-brand/10">3</td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">6</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Monthly Skill Intelligence Reports</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                        <td className="py-3 px-4 text-center font-bold text-brand bg-brand/5">1</td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">2</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">AI Interview Sessions / Month (20 mins)</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                        <td className="py-3 px-4 text-center font-bold text-brand bg-brand/5">3</td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">5</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Internship Readiness Score</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                        <td className="py-3 px-4 text-center text-emerald-600 bg-brand/5"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Application Tracker & Status</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                        <td className="py-3 px-4 text-center text-emerald-600 bg-brand/5"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Interview Feedback & Improvement Areas</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                        <td className="py-3 px-4 text-center text-emerald-600 bg-brand/5"><Check className="w-4 h-4 mx-auto" /></td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Monthly Market Analysis Reports</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                        <td className="py-3 px-4 text-center font-bold text-brand bg-brand/5">1</td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">2</td>
                      </tr>
                      <tr className="bg-muted/10">
                        <td className="py-3 px-6 text-foreground font-bold">Personal Branding Video</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                        <td className="py-3 px-4 text-center text-muted-foreground bg-brand/5">Buy once (₹129)</td>
                        <td className="py-3 px-4 text-center text-brand font-bold">Included</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Premium Portfolio Themes</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">Limited</td>
                        <td className="py-3 px-4 text-center text-foreground bg-brand/5">More</td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">All</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Advanced Skill Insights</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                        <td className="py-3 px-4 text-center text-foreground bg-brand/5">Basic</td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">Advanced</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Profile Analytics</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">Basic</td>
                        <td className="py-3 px-4 text-center text-foreground bg-brand/5">Standard</td>
                        <td className="py-3 px-4 text-center font-bold text-foreground">Advanced</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-6 text-foreground font-medium">Priority Opportunities & Elite Badge</td>
                        <td className="py-3 px-4 text-center text-muted-foreground">—</td>
                        <td className="py-3 px-4 text-center text-muted-foreground bg-brand/5">—</td>
                        <td className="py-3 px-4 text-center text-emerald-600"><Check className="w-4 h-4 mx-auto" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Add-Ons Section */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 max-w-5xl mx-auto text-left">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand">
                  FLEXIBLE CAREER ACCELERATION
                </span>
                <h4 className="text-xl font-extrabold text-foreground tracking-tight">
                  Capabilio Add-Ons
                </h4>
                <p className="text-xs text-muted-foreground font-sans">
                  Purchase standalone intelligence sessions and presentation enhancements as needed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 font-mono">
                
                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-foreground">Additional AI Interview</div>
                    <div className="text-[10px] text-muted-foreground">20 min mock with rubric review</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-brand">₹49</div>
                    <button 
                      onClick={() => openUpgradeModal('ai_interview')}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline block"
                    >
                      Get Session
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-foreground">Additional Market Report</div>
                    <div className="text-[10px] text-muted-foreground">Role hiring & salary signals</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-brand">₹49</div>
                    <button 
                      onClick={() => openUpgradeModal('market_report')}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline block"
                    >
                      Get Report
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-foreground">Personal Branding Video</div>
                    <div className="text-[10px] text-muted-foreground">
                      {currentPlan === 'elite' ? 'Included in Elite' : '45s portfolio story'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {currentPlan === 'elite' ? (
                      <span className="text-[10px] font-bold text-emerald-600 px-2 py-0.5 rounded bg-emerald-500/10">INCLUDED</span>
                    ) : (
                      <>
                        <div className="text-sm font-bold text-brand">₹129</div>
                        <button 
                          onClick={() => openUpgradeModal('personal_branding_video')}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline block"
                        >
                          Buy Once
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-foreground">Single Portfolio Theme</div>
                    <div className="text-[10px] text-muted-foreground">Distinctive design layout</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-brand">₹29</div>
                    <span className="text-[10px] text-muted-foreground block">Instant unlock</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-foreground">Gold Portfolio Theme</div>
                    <div className="text-[10px] text-muted-foreground">Executive verified showcase</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-brand">₹49</div>
                    <span className="text-[10px] text-muted-foreground block">Instant unlock</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* PROFESSIONAL PLANS */}
        {audienceTab === 'professional' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            <div className="p-6 rounded-3xl border border-border bg-card space-y-5 flex flex-col justify-between">
              <div className="space-y-3 font-mono">
                <h4 className="font-bold text-base text-foreground">Professional Standard</h4>
                <div className="text-2xl font-bold text-foreground">₹999 <span className="text-xs font-normal text-muted-foreground">/ month</span></div>
                <p className="text-xs text-muted-foreground font-sans">Continuous benchmarking, advanced architectural simulations, and capability vouchers.</p>
              </div>
              <Link href="/register" className="w-full py-2.5 rounded-xl border border-border text-foreground font-bold font-mono text-xs text-center block hover:bg-muted">Get Started</Link>
            </div>

            <div className="p-6 rounded-3xl border-2 border-brand bg-card shadow-xl space-y-5 flex flex-col justify-between">
              <div className="space-y-3 font-mono">
                <div className="text-[10px] uppercase px-2 py-0.5 rounded bg-brand/10 text-brand font-bold w-fit">POPULAR</div>
                <h4 className="font-bold text-base text-foreground">Professional Pro</h4>
                <div className="text-2xl font-bold text-brand">₹1,999 <span className="text-xs font-normal text-muted-foreground">/ month</span></div>
                <p className="text-xs text-muted-foreground font-sans">Senior & Staff engineer simulations, full system design evaluations, and talent network.</p>
              </div>
              <Link href="/register" className="w-full py-2.5 rounded-xl bg-brand text-white font-bold font-mono text-xs text-center block">Start Pro</Link>
            </div>

            <div className="p-6 rounded-3xl border border-border bg-card space-y-5 flex flex-col justify-between">
              <div className="space-y-3 font-mono">
                <h4 className="font-bold text-base text-foreground">Executive Career Track</h4>
                <div className="text-2xl font-bold text-foreground">₹4,999 <span className="text-xs font-normal text-muted-foreground">/ month</span></div>
                <p className="text-xs text-muted-foreground font-sans">Dedicated career coaching, recruiter matching, and personalized branding videos.</p>
              </div>
              <Link href="/register" className="w-full py-2.5 rounded-xl border border-border text-foreground font-bold font-mono text-xs text-center block hover:bg-muted">Contact Executive</Link>
            </div>
          </div>
        )}

        {/* COLLEGE PLANS */}
        {audienceTab === 'college' && (
          <div className="rounded-3xl border border-border bg-card p-8 text-left max-w-4xl mx-auto space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-brand uppercase">CAMPUS DEPLOYMENT</span>
              <h4 className="text-2xl font-extrabold text-foreground">Institutional & College Campus License</h4>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                Empower entire department cohorts (CSE, ECE, Data Science, MBA) with real-world work simulation, cohort gap telemetry, and employer hiring pipelines.
              </p>
            </div>
            <a 
              href="mailto:partners@capabilio.ai" 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold font-mono shadow-md"
            >
              <span>Request Institutional Demo</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

      </div>

      {/* 3. Final Trust & Proof Call to Action */}
      <div className="p-8 sm:p-12 rounded-3xl border-2 border-brand/40 bg-gradient-to-br from-card via-card to-brand/10 shadow-2xl text-center space-y-6">
        <div className="space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
            PROOF IS THE NEW PROFESSIONAL CURRENCY
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            STOP DESCRIBING WHAT YOU CAN DO. <br />
            <span className="text-brand">START PROVING IT.</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 font-sans">
            Don&apos;t graduate with an unread resume. Build living proof, master real workstations, and get discovered by top companies.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/register"
            className="px-8 py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold font-mono shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02]"
          >
            <span>BUILD MY CAREER PROOF →</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="px-6 py-3.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold font-mono transition-colors"
          >
            <span>SEE HOW IT WORKS</span>
          </a>
        </div>
      </div>

    </section>
  );
}
