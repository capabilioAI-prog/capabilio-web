'use client';

import React, { useState } from 'react';
import { 
  Terminal, 
  Code2, 
  Play, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  FileCode, 
  FolderTree, 
  ShieldCheck, 
  Zap,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export function ArenaWorkstationPreview() {
  const [activeTab, setActiveTab] = useState<'code' | 'tests' | 'mentor'>('code');
  const [isRunning, setIsRunning] = useState(false);

  function handleRunTests() {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setActiveTab('tests');
    }, 700);
  }

  return (
    <div className="w-full max-w-6xl mx-auto rounded-2xl border border-border bg-card shadow-2xl overflow-hidden font-sans">
      {/* Workstation Top Bar */}
      <div className="bg-graphite-950 text-graphite-300 px-4 sm:px-6 py-3 border-b border-graphite-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="font-mono text-graphite-400 text-[11px]">
            Capabilio Arena IDE • Sprint 42 • Ticket PROD-4821
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-graphite-400 font-mono text-[11px]">
            <span>Role:</span>
            <span className="text-brand font-semibold">Backend Developer</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Deterministic Sandbox</span>
          </div>
        </div>
      </div>

      {/* Workspace Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border min-h-[460px]">
        {/* Left Column: Repository Tree & Sprint Context */}
        <div className="lg:col-span-3 bg-muted/20 p-4 space-y-4 text-xs">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-brand" />
              Repository Explorer
            </div>
            <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
              <div className="text-foreground font-semibold flex items-center gap-1">
                <ChevronRight className="w-3 h-3" /> src/
              </div>
              <div className="pl-4 text-brand font-medium flex items-center gap-1">
                <FileCode className="w-3 h-3" /> middleware/auth.ts
              </div>
              <div className="pl-4 flex items-center gap-1">
                <FileCode className="w-3 h-3" /> services/redis.ts
              </div>
              <div className="pl-4 flex items-center gap-1">
                <FileCode className="w-3 h-3" /> tests/auth.test.ts
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/80 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Sprint Ticket Context
            </div>
            <div className="p-2.5 bg-card border border-border rounded-lg space-y-1.5">
              <div className="font-semibold text-foreground text-[11px]">
                Fix Token-Bucket Auth Middleware Rate Limiting
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                High-volume burst traffic on payment gateway causes 500 crashes instead of clean HTTP 429 backoff.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-border/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              Acceptance Criteria
            </div>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>Return 429 when capacity exceeded</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>Include Retry-After header</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>Zero unhandled promise rejections</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Center Column: Monaco Code Editor & Test Runner */}
        <div className="lg:col-span-6 flex flex-col bg-graphite-950 text-graphite-100">
          {/* Editor Tabs & Run Action */}
          <div className="bg-graphite-900 border-b border-graphite-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('code')}
                className={
                  activeTab === 'code'
                    ? 'px-3 py-1 rounded text-xs font-mono bg-graphite-800 text-white font-semibold'
                    : 'px-3 py-1 rounded text-xs font-mono text-graphite-400 hover:text-white'
                }
              >
                auth.ts
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={
                  activeTab === 'tests'
                    ? 'px-3 py-1 rounded text-xs font-mono bg-graphite-800 text-white font-semibold flex items-center gap-1.5'
                    : 'px-3 py-1 rounded text-xs font-mono text-graphite-400 hover:text-white flex items-center gap-1.5'
                }
              >
                <span>Test Results</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </button>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isRunning ? 'Executing Suite...' : 'Run Test Suite'}</span>
            </button>
          </div>

          {/* Editor Body */}
          <div className="p-4 font-mono text-xs leading-relaxed flex-1 overflow-auto bg-graphite-950 text-graphite-200">
            {activeTab === 'code' && (
              <div className="space-y-1 font-mono text-[12px]">
                <div className="text-graphite-500">{"1  import { NextRequest, NextResponse } from 'next/server';"}</div>
                <div className="text-graphite-500">{"2  import { redisClient } from '../services/redis';"}</div>
                <div className="text-graphite-500">{"3  "}</div>
                <div className="text-graphite-500">{"4  export async function checkRateLimit(req: NextRequest) {"}</div>
                <div className="text-graphite-500">{"5    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';"}</div>
                <div className="text-brand font-semibold">{"6    const bucketKey = 'rate_limit:' + ip;"}</div>
                <div className="text-brand font-semibold">{"7    const current = await redisClient.incr(bucketKey);"}</div>
                <div className="text-graphite-500">{"8    "}</div>
                <div className="text-graphite-300">{"9    if (current > 100) {"}</div>
                <div className="text-emerald-400">{"10     return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });"}</div>
                <div className="text-graphite-300">{"11   }"}</div>
                <div className="text-graphite-500">{"12   return NextResponse.next();"}</div>
                <div className="text-graphite-500">{"13 }"}</div>
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="text-emerald-400 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PASS: 4/4 Deterministic Unit Assertions Passed in 142ms</span>
                </div>
                <div className="space-y-1.5 pl-6 text-graphite-300 text-[11px]">
                  <div className="text-emerald-400">✓ Allows 100 requests per window with HTTP 200 OK</div>
                  <div className="text-emerald-400">✓ Returns HTTP 429 when threshold exceeded</div>
                  <div className="text-emerald-400">✓ Appends valid Retry-After header to rate limited response</div>
                  <div className="text-emerald-400">✓ Gracefully handles Redis connectivity blips</div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                  <span className="font-bold">Score: 100 / 100 (100% Correctness)</span>
                  <span className="px-2 py-0.5 rounded bg-brand text-white font-bold">+8 ELO Reward</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Mentor Guidance & ELO Impact */}
        <div className="lg:col-span-3 bg-muted/20 p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              AI Engineering Mentor
            </span>
            <span className="text-[10px] font-mono text-brand font-semibold">Active</span>
          </div>

          <div className="p-3 bg-card border border-border rounded-xl space-y-2">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Architectural Insight</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Great job implementing the sliding window rate limiter. You correctly added the <code className="text-foreground font-mono bg-muted px-1 rounded">Retry-After</code> header, which prevents API consumers from hammering the backend during spikes.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Career Skill Progression
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-foreground font-medium">API Architecture</span>
                  <span className="text-brand font-mono font-semibold">+6%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full w-[78%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-foreground font-medium">Redis Caching</span>
                  <span className="text-brand font-mono font-semibold">+9%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full w-[84%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <Link
              href="/register"
              className="w-full py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Practice This Workstation</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
