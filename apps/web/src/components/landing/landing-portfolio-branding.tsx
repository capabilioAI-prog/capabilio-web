"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FileCheck2, 
  Video, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink,
  Eye
} from 'lucide-react';
import { EvidenceDetailsModal, EvidenceDetailRecord } from '@/components/vault/evidence-details-modal';

export const TIMELINE_EVIDENCE_RECORDS: EvidenceDetailRecord[] = [
  {
    id: 'proof-aug-assessment',
    month: 'AUG',
    type: 'Career Calibration Assessment',
    title: 'Technical Baseline Calibration',
    roleName: 'Software Engineer',
    status: 'Completed',
    score: 64,
    maxScore: 100,
    eloBefore: 400,
    eloDelta: -16,
    eloAfter: 384,
    scenario: 'Initial comprehensive 25-question evaluation measuring computer science fundamentals, async event loops, and relational schema normalization.',
    objectives: [
      'Establish student baseline Career ELO rating',
      'Benchmark diagnostic reasoning speed',
      'Identify immediate skill gaps in database transactions'
    ],
    workPerformed: {
      language: 'TypeScript / SQL',
      filesChanged: ['calibration/assessment-submission.json'],
      codeSnippet: `// Baseline diagnostic evaluation
function processBatch(records: Array<{ id: string; val: number }>) {
  // Candidate relied on unbatched sequential awaits
  return records.map(async r => await db.insert(r));
}`,
      testResults: [
        '✓ PASS test_data_structures_trees (12ms)',
        '✓ PASS test_async_await_promises (10ms)',
        '✕ FAIL test_concurrent_batch_throughput (Sequential loop exceeded 200ms latency ceiling)',
        '✕ FAIL test_transaction_rollback_invariants'
      ]
    },
    evaluation: {
      correct: [
        'Correctly explained event loop macro/microtask priorities',
        'Accurately constructed standard binary tree traversal'
      ],
      incorrect: [
        'Did not utilize Promise.all() or chunked parallel batches',
        'Missing ACID rollback handler on mid-batch failure'
      ]
    },
    scoreBreakdown: [
      { category: 'CS Fundamentals', score: 20, max: 25 },
      { category: 'Async Architecture', score: 14, max: 25 },
      { category: 'Data Structures', score: 18, max: 25 },
      { category: 'Database Concepts', score: 12, max: 25 }
    ],
    skillsAffected: [
      { skill: 'Debugging', before: 60, after: 54 },
      { skill: 'Testing', before: 62, after: 56 },
      { skill: 'APIs & REST', before: 65, after: 61 }
    ],
    nextBestAction: {
      description: 'Complete an asynchronous batch concurrency mission in Arena.',
      ctaLabel: 'Practice in Arena',
      ctaHref: '/arena'
    }
  },
  {
    id: 'proof-sep-mission',
    month: 'SEP',
    type: 'Arena Mission',
    title: 'API Development & JWT Rate Limiting',
    roleName: 'Software Engineer',
    status: 'Verified',
    score: 96,
    maxScore: 100,
    eloBefore: 384,
    eloDelta: 28,
    eloAfter: 412,
    scenario: 'High-traffic API endpoints were vulnerable to brute-force attacks and token replay. Engineered an atomic sliding-window rate limiter with Redis Lua scripting.',
    objectives: [
      'Implement atomic sliding-window algorithm in Redis',
      'Enforce cryptographic HMAC token expiration',
      'Return standard HTTP 429 Retry-After response headers'
    ],
    workPerformed: {
      language: 'TypeScript / Redis Lua',
      filesChanged: ['apps/api/src/lib/rate-limiter.ts', 'apps/api/src/middleware/auth.ts'],
      codeSnippet: `// Redis sliding window token bucket implementation
const LUA_SCRIPT = \`
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
  if redis.call('ZCARD', key) < limit then
    redis.call('ZADD', key, now, now)
    return 1
  end
  return 0
\`;`,
      testResults: [
        '✓ PASS test_rate_limiter_burst_tolerance (14ms)',
        '✓ PASS test_concurrency_race_condition_zero_leakage (19ms)',
        '✓ PASS test_jwt_tampered_signature_rejection (8ms)'
      ]
    },
    evaluation: {
      correct: [
        'Flawless atomic Redis Lua script execution',
        'Correctly calculated sliding time delta without race conditions',
        'Standard HTTP 429 & Retry-After response headers'
      ],
      incorrect: []
    },
    scoreBreakdown: [
      { category: 'Problem Understanding', score: 25, max: 25 },
      { category: 'Technical Execution', score: 30, max: 30 },
      { category: 'Debugging & Performance', score: 20, max: 20 },
      { category: 'Testing Assertions', score: 15, max: 15 },
      { category: 'Code Clarity', score: 6, max: 10 }
    ],
    skillsAffected: [
      { skill: 'APIs & REST', before: 61, after: 75 },
      { skill: 'Debugging', before: 54, after: 68 },
      { skill: 'Git Workflow', before: 70, after: 81 }
    ],
    nextBestAction: {
      description: 'Advance to production checkout debugging simulation.',
      ctaLabel: 'Continue to Mission',
      ctaHref: '/arena'
    }
  },
  {
    id: 'proof-oct-debugging',
    month: 'OCT',
    type: 'Production Incident Simulation',
    title: 'Production Checkout Regression',
    roleName: 'Software Engineer',
    status: 'Evaluated',
    score: 58,
    maxScore: 100,
    eloBefore: 428,
    eloDelta: -12,
    eloAfter: 416,
    scenario: 'Checkout conversion dropped by 18% after a frontend release. Investigated error logs, reproduced validation failures, and analyzed API response payloads.',
    objectives: [
      'Investigate the checkout regression logs',
      'Identify root cause of validation error',
      'Implement correction and verify edge cases',
      'Provide comprehensive incident retrospective'
    ],
    workPerformed: {
      language: 'TypeScript / Next.js',
      filesChanged: ['apps/web/src/components/checkout-form.tsx'],
      codeSnippet: `// Handled client state validation, but missed API timeout edge case
function submitPayment(data: PaymentData) {
  if (!data.cardNumber) return { error: 'REQUIRED' };
  // Missed handling network socket timeout or exponential retry
  return api.post('/pay', data);
}`,
      testResults: [
        '✓ PASS test_client_side_form_validation (11ms)',
        '✕ FAIL test_api_network_timeout_retry_backoff',
        '✕ FAIL test_idempotency_key_duplicate_prevention'
      ]
    },
    evaluation: {
      correct: [
        'Identified affected checkout component',
        'Reproduced synchronous field validation failure'
      ],
      incorrect: [
        'Did not implement API timeout retry logic',
        'Missing idempotency key on checkout submission payload'
      ]
    },
    scoreBreakdown: [
      { category: 'Problem Understanding', score: 18, max: 25 },
      { category: 'Technical Execution', score: 16, max: 30 },
      { category: 'Debugging', score: 10, max: 20 },
      { category: 'Testing', score: 8, max: 15 },
      { category: 'Explanation', score: 6, max: 10 }
    ],
    skillsAffected: [
      { skill: 'Debugging', before: 74, after: 68 },
      { skill: 'Testing', before: 65, after: 61 },
      { skill: 'APIs & REST', before: 75, after: 75 }
    ],
    nextBestAction: {
      description: 'Complete a debugging mission focused on API failure diagnosis and idempotency.',
      ctaLabel: 'Practice in Arena',
      ctaHref: '/arena'
    }
  },
  {
    id: 'proof-nov-interview',
    month: 'NOV',
    type: 'AI Technical Work Interview',
    title: 'System Design & Authentication Incident Defense',
    roleName: 'Software Engineer',
    status: 'Verified',
    score: 88,
    maxScore: 100,
    eloBefore: 416,
    eloDelta: 24,
    eloAfter: 440,
    scenario: 'Live interactive technical interview with Capabilio AI Staff Interviewer defending distributed authentication architecture, token revocation strategies, and cross-region cache replication.',
    objectives: [
      'Defend distributed session design under high concurrency',
      'Explain trade-offs between symmetric HMAC vs asymmetric RSA keys',
      'Live code token rotation middleware with clock-skew tolerance'
    ],
    workPerformed: {
      language: 'TypeScript / System Design Architecture',
      filesChanged: ['interview/transcript-evidence.json', 'interview/session-design.ts'],
      codeSnippet: `// Asymmetric JWKS token validator with key cache and 60s clock tolerance
export async function verifyJwksSignature(token: string) {
  const decodedHeader = jwt.decode(token, { complete: true });
  const key = await jwksClient.getSigningKey(decodedHeader.header.kid);
  return jwt.verify(token, key.getPublicKey(), { clockTolerance: 60 });
}`,
      testResults: [
        '✓ PASS test_jwks_public_key_caching (12ms)',
        '✓ PASS test_clock_skew_60s_boundary (9ms)',
        '✓ PASS test_ai_interviewer_technical_rubric (88/100)'
      ]
    },
    evaluation: {
      correct: [
        'Superb articulation of asymmetric key rotation algorithms',
        'Addressed 60-second server clock-skew edge case during live challenge',
        'Structured answers into problem decomposition, risk analysis, and implementation'
      ],
      incorrect: [
        'Could provide more concrete memory limits for local key cache'
      ]
    },
    scoreBreakdown: [
      { category: 'Technical Depth', score: 26, max: 30 },
      { category: 'Problem Solving', score: 27, max: 30 },
      { category: 'Communication & Defense', score: 20, max: 20 },
      { category: 'Live Code Execution', score: 15, max: 20 }
    ],
    skillsAffected: [
      { skill: 'Debugging', before: 68, after: 78 },
      { skill: 'APIs & REST', before: 75, after: 84 },
      { skill: 'Testing', before: 61, after: 69 }
    ],
    nextBestAction: {
      description: 'Target Senior Engineer distributed systems missions in Arena.',
      ctaLabel: 'Explore Launchpad Roles',
      ctaHref: '/launchpad'
    }
  }
];

export function LandingPortfolioBranding() {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceDetailRecord | null>(null);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/80 bg-muted/20">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
            PORTFOLIO & LIVING EVIDENCE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Build a portfolio from work you&apos;ve actually done.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every completed Arena simulation, passing test run, and verified technical interview automatically generates cryptographic evidence. Both positive and negative calibrations reflect authentic engineering ability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left: Evidence Timeline */}
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-md space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-foreground">Evidence Timeline</h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground font-semibold">Live Feed</span>
            </div>

            <div className="space-y-3.5 text-xs font-sans">
              {TIMELINE_EVIDENCE_RECORDS.map((rec) => {
                const isPositive = rec.eloDelta >= 0;
                return (
                  <div key={rec.id} className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="font-mono text-xs font-bold text-brand shrink-0 w-8 pt-0.5">
                        {rec.month}
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{rec.title}</span>
                          {isPositive ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-2xs text-muted-foreground font-mono">
                          {rec.type} • Score {rec.score}/{rec.maxScore}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                        isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                        {isPositive ? `+${rec.eloDelta} ELO` : `${rec.eloDelta} ELO`}
                      </span>
                      <button
                        onClick={() => setSelectedEvidence(rec)}
                        className="px-2.5 py-1 rounded-lg bg-foreground hover:bg-foreground/90 text-background font-mono font-bold text-2xs transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Eye className="w-3 h-3" />
                        <span>VIEW DETAILS</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href="/aura?tab=vault"
              className="w-full py-2.5 px-4 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-bold text-center block transition-colors"
            >
              Explore Your Living Career Vault →
            </Link>
          </div>

          {/* Right: Personal Branding */}
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-md space-y-6 text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-brand" />
                  <h3 className="font-bold text-base text-foreground">Personal Branding Video Pitch</h3>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand/10 text-brand font-bold">
                  45s Video Script
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Kopuri Venkata</span>
                  <span className="font-mono text-brand font-bold">440 ELO (Calibrated)</span>
                </div>
                
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  &ldquo;I am a Software Engineer specializing in backend reliability and rate-limiting architectures. Through Capabilio Arena, I diagnosed production checkout regressions, implemented atomic Redis Lua sliding windows, and defended distributed authentication in live AI technical interviews.&rdquo;
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                    ✓ 18 Verified Work Samples
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">
                    ✓ 73% Career Readiness
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-bold">
                    ✓ 100% Cryptographic Proof
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/aura?tab=dashboard"
              className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold text-center block transition-colors shadow-xs"
            >
              Build My Professional Profile →
            </Link>
          </div>

        </div>

      </div>

      {/* Centered Modal for Evidence Details */}
      <EvidenceDetailsModal
        evidence={selectedEvidence}
        isOpen={!!selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </section>
  );
}
