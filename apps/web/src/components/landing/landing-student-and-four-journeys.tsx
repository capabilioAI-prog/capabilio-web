"use client";

import React from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Briefcase, 
  Sparkles, 
  Building2, 
  Users, 
  ArrowRight, 
  Target, 
  Award,
  CheckCircle2,
  TrendingUp,
  LineChart,
  Compass,
  Building,
  Zap,
  Network
} from 'lucide-react';

const STUDENT_STEPS = [
  { num: '01', title: 'Create Account', desc: 'Starting Student Baseline ELO: 400' },
  { num: '02', title: 'Select Career Track', desc: 'Choose from 9+ real industry disciplines' },
  { num: '03', title: 'Career Calibration', desc: 'Initial baseline assessment across core skills' },
  { num: '04', title: 'Skill Graph & Gaps', desc: 'Continuous diagnostic telemetry' },
  { num: '05', title: 'Arena Workstations', desc: 'Solve real production sprint tickets' },
  { num: '06', title: 'Living Portfolio', desc: 'Earn cryptographic proof & evidence' },
  { num: '07', title: 'AI Live Interview', desc: 'Defend architecture in technical simulations' },
];

export function LandingStudentAndFourJourneys() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/80 bg-muted/10 space-y-20">
      
      {/* 1. Student Journey Progression */}
      <div id="for-students" className="max-w-6xl mx-auto space-y-12 text-center">
        <div className="space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
            THE STUDENT PROGRESSION
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            From 400 Baseline ELO to Hired Engineer.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every student begins at 400 ELO. Your Career Calibration establishes your living baseline, leading directly into hands-on Arena workstations, AI Live Work Interviews, and evidence-backed recruitment.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-left">
          {STUDENT_STEPS.map(s => (
            <div key={s.num} className="p-4 rounded-2xl border border-border bg-card space-y-2">
              <span className="text-xs font-mono font-extrabold text-brand block">{s.num}</span>
              <h4 className="font-bold text-xs text-foreground leading-tight">{s.title}</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Four Capabilio Ecosystem Pathways */}
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
            FOUR ECOSYSTEM PATHWAYS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Tailored capability operating systems for every career stage.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Capabilio connects students, professionals, founders, and institutions through evidence-backed talent intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          
          {/* 1. FOR STUDENTS */}
          <div className="p-6 rounded-3xl border-2 border-brand/30 bg-card shadow-md space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="p-2.5 rounded-2xl bg-brand/10 text-brand w-fit">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-brand uppercase">PATHWAY 01</span>
                <h3 className="font-extrabold text-base text-foreground">FOR STUDENTS</h3>
              </div>
              <p className="text-xs font-semibold text-foreground">
                &ldquo;Prove your skills through real work.&rdquo;
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Graduate with evidence instead of an unverified resume. Start at 400 ELO, solve authentic sprint tickets in Arena, and unlock hiring opportunities.
              </p>
            </div>
            <Link
              href="/register?role=student"
              className="text-xs font-bold text-brand flex items-center justify-between pt-3 border-t border-border hover:underline"
            >
              <span>Start as Student</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 2. FOR PROFESSIONALS */}
          <div id="for-professionals" className="p-6 rounded-3xl border border-border bg-card shadow-md space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 w-fit">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">PATHWAY 02</span>
                <h3 className="font-extrabold text-base text-foreground">FOR PROFESSIONALS</h3>
              </div>
              <p className="text-xs font-semibold text-foreground">
                &ldquo;Turn experience into verified career intelligence.&rdquo;
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Build a living professional profile around demonstrated capability. Benchmark your skills against Staff-level roles and practice role-transition missions.
              </p>
            </div>
            <Link
              href="/register?role=professional"
              className="text-xs font-bold text-blue-600 flex items-center justify-between pt-3 border-t border-border hover:underline"
            >
              <span>Start Professional Path</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3. FOR EXECUTIVES */}
          <div id="for-executives" className="p-6 rounded-3xl border border-border bg-card shadow-md space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 w-fit">
                <Network className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">PATHWAY 03</span>
                <h3 className="font-extrabold text-base text-foreground">FOR EXECUTIVES</h3>
              </div>
              <p className="text-xs font-semibold text-foreground">
                &ldquo;Build, connect, raise, hire, and scale.&rdquo;
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A dedicated ecosystem for founders, CEOs, CTOs, mentors, and investors. Turn ideas into ventures and connect with operators and capital.
              </p>

              {/* Founder Signal Telemetry Preview */}
              <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/15 space-y-1.5 font-mono text-[10px]">
                <div className="text-purple-700 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Founder Signal</span>
                  <span className="text-purple-600">Active</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <div>Investor Ready: <strong className="text-foreground">78%</strong></div>
                  <div>Market Opp: <strong className="text-foreground">84%</strong></div>
                  <div>Execution: <strong className="text-foreground">71%</strong></div>
                  <div>Target: <strong className="text-foreground">₹2.4Cr</strong></div>
                </div>
              </div>
            </div>
            <Link
              href="/register?role=executive"
              className="text-xs font-bold text-purple-600 flex items-center justify-between pt-3 border-t border-border hover:underline"
            >
              <span>Explore Executive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4. FOR ORGANISATIONS */}
          <div id="for-organisations" className="p-6 rounded-3xl border border-border bg-card shadow-md space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 w-fit">
                <Building className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase">PATHWAY 04</span>
                <h3 className="font-extrabold text-base text-foreground">FOR ORGANISATIONS</h3>
              </div>
              <p className="text-xs font-semibold text-foreground">
                &ldquo;Discover, develop, and hire capability at scale.&rdquo;
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For companies, colleges, universities, and enterprise teams. Build talent pipelines around demonstrated skill telemetry, cohort analytics, and verified candidate evidence.
              </p>
              <div className="flex flex-wrap gap-1 text-[10px] font-mono text-muted-foreground pt-1">
                <span className="px-1.5 py-0.5 rounded bg-muted">Companies</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Colleges</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Universities</span>
                <span className="px-1.5 py-0.5 rounded bg-muted">Enterprises</span>
              </div>
            </div>
            <Link
              href="/register?role=organisation"
              className="text-xs font-bold text-emerald-600 flex items-center justify-between pt-3 border-t border-border hover:underline"
            >
              <span>Explore Organisations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>

    </section>
  );
}
