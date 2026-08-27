'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bot, ArrowRight, Clock, Award, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AuraInterviewsPage() {
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [readiness, setReadiness] = useState(72);
  const [readinessTrend, setReadinessTrend] = useState(8);

  useEffect(() => {
    async function loadInterviews() {
      try {
        const res = await fetch('http://localhost:3001/api/interview/history', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setInterviews(data.data.interviews || []);
            setReadiness(data.data.interviewReadiness || 72);
            setReadinessTrend(data.data.readinessTrend || 8);
          }
        }
      } catch (err) {
        console.error('Error loading aura interviews:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInterviews();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-20">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          <Link href="/aura" className="text-xs font-mono font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO AURA CAREER OS</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-2xs font-mono font-bold uppercase text-brand">AURA CAREER OS // INTERVIEW INTELLIGENCE</div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Verified AI Interview History
              </h1>
            </div>

            <div className="p-4 rounded-2xl bg-brand/10 border border-brand/20 text-right font-mono">
              <div className="text-[10px] text-brand uppercase font-bold">INTERVIEW READINESS</div>
              <div className="text-2xl font-black text-brand flex items-center justify-end gap-1">
                <span>{readiness}%</span>
                <span className="text-xs text-emerald-500 font-bold">↑{readinessTrend}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-sans text-foreground">
            All Completed & Verified Sessions ({interviews.length})
          </h2>
          <Link
            href="/interview"
            className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-mono font-bold hover:bg-brand-hover transition-all"
          >
            + Start New Interview
          </Link>
        </div>

        {interviews.length === 0 ? (
          <div className="p-12 rounded-3xl border border-dashed border-border bg-card text-center space-y-3 font-mono text-xs text-muted-foreground">
            <Bot className="w-8 h-8 mx-auto text-muted-foreground" />
            <div className="font-bold text-foreground">No Verified Interviews Recorded</div>
            <p>Complete an AI Technical Interview to generate verified career proof and update your interview readiness.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {interviews.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-border bg-card hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.score >= 70 ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                    }`}>
                      {item.score >= 70 ? '✓ VERIFIED' : 'IMPROVEMENT REQUIRED'}
                    </span>
                    <span className="font-bold text-sm text-foreground font-sans">
                      {item.roleTitle} {item.mode?.toUpperCase()} INTERVIEW
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-[11px]">
                    <span>Score: <strong className="text-foreground">{item.score}/100</strong></span>
                    <span>•</span>
                    <span>Readiness: <strong className="text-foreground">{item.readinessScore}%</strong></span>
                    <span>•</span>
                    <span>Duration: {item.durationMinutes}m</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <Link
                  href={`/interview/${item.id}/results`}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold font-mono transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <span>View Details & Proof</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
