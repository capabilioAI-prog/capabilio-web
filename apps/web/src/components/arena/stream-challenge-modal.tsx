"use client";

import React, { useState } from 'react';
import { 
  X, 
  Play, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Terminal, 
  Sparkles, 
  Layers, 
  Code, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';

interface StreamChallengeModalProps {
  challenge: any;
  streamName: string;
  shortCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function StreamChallengeModal({
  challenge,
  streamName,
  shortCode,
  onClose,
  onSuccess,
}: StreamChallengeModalProps) {
  const [code, setCode] = useState(challenge?.starterCode || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(isFlawed = false) {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`http://localhost:3001/api/arena/stream-challenges/${challenge.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          streamSlug: challenge.streamSlug || 'cse',
          code,
          isFlawedAttempt: isFlawed,
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.evaluation) {
        setEvaluationResult(data.data.evaluation);
        onSuccess();
      } else {
        setErrorMsg(data.error?.message || data.error || 'Submission failed');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Network error submitting stream challenge');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="bg-card border-2 border-brand/30 rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-left font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-xl bg-brand/10 text-brand font-bold uppercase">
              {shortCode} STREAM CHALLENGE
            </span>
            <span className="text-muted-foreground font-semibold">• {challenge.category}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Post-Evaluation Result View */}
          {evaluationResult ? (
            <div className="space-y-6 text-center animate-fade-in font-mono">
              <div className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  evaluationResult.passed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                }`}>
                  {evaluationResult.passed ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-extrabold text-foreground">{challenge.title}</h3>
                <span className={`text-xs px-3 py-1 rounded-xl font-bold ${
                  evaluationResult.passed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                }`}>
                  {evaluationResult.verdict}
                </span>
              </div>

              {/* Metric Badges */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase">Score</div>
                  <div className="text-2xl font-black text-foreground mt-1">{evaluationResult.score} / 100</div>
                </div>

                <div className={`p-4 rounded-2xl border ${
                  evaluationResult.passed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-red-500/10 border-red-500/30 text-red-600'
                }`}>
                  <div className="text-[10px] uppercase font-bold">Stream Rating Delta</div>
                  <div className="text-2xl font-black flex items-center justify-center gap-1 mt-1">
                    {evaluationResult.streamDelta > 0 ? (
                      <>
                        <TrendingUp className="w-5 h-5" />
                        <span>+{evaluationResult.streamDelta} PTS</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-5 h-5" />
                        <span>{evaluationResult.streamDelta} PTS</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase">Target Complexity</div>
                  <div className="text-xs font-bold text-foreground mt-2">{evaluationResult.complexityAchieved}</div>
                </div>
              </div>

              {/* Mentor Feedback */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-left space-y-1">
                <span className="text-[10px] font-bold text-brand uppercase">ACADEMIC TUTOR REMARK:</span>
                <p className="text-xs text-muted-foreground font-sans leading-relaxed">{evaluationResult.mentorFeedback}</p>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold font-mono transition-colors shadow-xs"
              >
                Return to Stream Arena
              </button>
            </div>
          ) : (
            <>
              {/* Problem Statement */}
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-foreground">{challenge.title}</h2>
                <p className="text-muted-foreground leading-relaxed font-sans">{challenge.problemStatement}</p>
              </div>

              {/* Constraints & Complexity Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-2xs">
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-1">
                  <span className="font-bold text-foreground uppercase">Constraints</span>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    {challenge.constraints?.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border space-y-1">
                  <span className="font-bold text-foreground uppercase">Target Complexity</span>
                  <p className="text-brand font-bold">{challenge.expectedComplexity}</p>
                  <p className="text-muted-foreground italic">Hint: {challenge.solutionHint}</p>
                </div>
              </div>

              {/* Code Solution Editor */}
              <div className="space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-2xs text-muted-foreground">
                  <span className="font-bold uppercase text-foreground">Solution Implementation</span>
                  <span>TypeScript / Algorithm</span>
                </div>
                <div className="p-4 bg-[#0D1117] text-[#E6EDF3] rounded-2xl border border-border overflow-hidden">
                  <textarea
                    rows={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-transparent border-none focus:outline-hidden resize-none font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono">
                  {errorMsg}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer CTAs */}
        {!evaluationResult && (
          <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 font-mono text-xs">
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 font-semibold transition-colors disabled:opacity-50"
            >
              Simulate Sub-Optimal Attempt (-8 Pts)
            </button>

            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold shadow-md shadow-brand/20 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Evaluating Algorithm...' : 'Submit Validated Solution (+12 Pts)'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
