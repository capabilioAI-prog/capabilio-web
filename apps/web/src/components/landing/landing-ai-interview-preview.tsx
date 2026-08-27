"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Mic2, 
  Play, 
  Send, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Terminal, 
  Code2, 
  ShieldCheck, 
  ArrowRight,
  Bot,
  User,
  Clock,
  Zap,
  Sliders,
  Check,
  AlertTriangle
} from 'lucide-react';

export function LandingAiInterviewPreview() {
  const [interviewStage, setInterviewStage] = useState<'idle' | 'in_progress' | 'evaluated'>('idle');
  const [selectedRole, setSelectedRole] = useState('Software Engineer');
  const [currentStep, setCurrentStep] = useState(0);
  const [userResponse, setUserResponse] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; code?: string }>>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const INTERVIEW_STAGES = [
    {
      role: 'Software Engineer',
      scenarioTitle: 'Production Checkout 500 Incident & Token Expiry',
      initialAiMessage: "Welcome. You're investigating a live production incident: the checkout endpoint is failing with HTTP 500 for approximately 8% of users after the latest deployment.\n\nTake a look at the middleware in the workstation on your right. How would you investigate and narrow down the root cause?",
      sampleAnswer: "I would first inspect the error stack trace in the server logs. In auth.ts, the payload.metadata direct access is causing an uncaught TypeError when metadata is undefined on guest checkout tokens.",
      followUpAiMessage: "Good catch on the null metadata access. Now suppose we patch that, but valid JWT tokens from our mobile app are still intermittently rejected with 'TOKEN_EXPIRED'. What edge case would you check in a distributed cluster?",
      secondSampleAnswer: "I would check server clock-skew tolerance. In distributed environments, servers can drift by 1-2 seconds. I would configure a 60-second clockTolerance in jwt.verify() to prevent premature rejection.",
      finalCode: `// apps/api/src/middleware/checkout-auth.ts
export function verifyCheckoutSession(token: string, secret: string) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'MALFORMED_TOKEN' };
  }
  try {
    // 60-second clock tolerance handles distributed server clock-skew
    const payload = jwt.verify(token, secret, { clockTolerance: 60 });
    const metadata = payload.metadata || {};
    return { valid: true, user: payload, tier: metadata.tier || 'standard' };
  } catch (err) {
    return { valid: false, error: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_SIGNATURE' };
  }
}`
    }
  ];

  const stageData = INTERVIEW_STAGES[0]!;

  const handleStart = () => {
    setInterviewStage('in_progress');
    setCurrentStep(0);
    setMessages([
      { sender: 'ai', text: stageData.initialAiMessage }
    ]);
  };

  const handleSendResponse = (textToSend?: string) => {
    const text = textToSend || userResponse;
    if (!text.trim()) return;

    const newMsgs = [...messages, { sender: 'user' as const, text }];
    setMessages(newMsgs);
    setUserResponse('');
    setIsAiThinking(true);

    setTimeout(() => {
      if (currentStep === 0) {
        setMessages([
          ...newMsgs,
          { sender: 'ai', text: stageData.followUpAiMessage }
        ]);
        setCurrentStep(1);
        setIsAiThinking(false);
      } else {
        // Complete evaluation
        setInterviewStage('evaluated');
        setIsAiThinking(false);
      }
    }, 900);
  };

  const handleReset = () => {
    setInterviewStage('idle');
    setCurrentStep(0);
    setUserResponse('');
    setMessages([]);
    setIsAiThinking(false);
  };

  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-border bg-gradient-to-b from-background via-card/40 to-background relative overflow-hidden text-left">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/60 text-xs font-mono text-brand font-semibold">
            <Mic2 className="w-3.5 h-3.5" />
            <span>AI LIVE TECHNICAL WORK INTERVIEWS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Don&apos;t just answer questions. Work through the interview.
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed font-sans">
            Capabilio AI interviewers behave like real Staff Engineers. They observe your code, question your architecture, challenge your trade-offs, and adjust your Career ELO rating based on verified technical reasoning.
          </p>
        </div>

        {/* Live Interview Simulator Container */}
        <div className="rounded-3xl border-2 border-border bg-card shadow-2xl overflow-hidden">
          
          {/* Top Bar */}
          <div className="bg-muted/80 border-b border-border px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="font-bold text-foreground">CAPABILIO AI INTERVIEW // LIVE WORK SIMULATION</span>
              <span className="text-muted-foreground hidden sm:inline">• Role: {stageData.role}</span>
            </div>

            <div className="flex items-center gap-2 text-2xs font-mono">
              <span className="px-2.5 py-1 rounded bg-brand/10 text-brand font-bold">
                Level: Intermediate / Staff
              </span>
              <span className="text-muted-foreground">Est. 20 Mins</span>
            </div>
          </div>

          {/* Body: 3-Area Layout */}
          {interviewStage === 'idle' ? (
            <div className="p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-3xl bg-brand/10 text-brand flex items-center justify-center mx-auto border border-brand/20">
                <Bot className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground">
                  Live Work Interview: {stageData.scenarioTitle}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  You will meet your AI Technical Interviewer, investigate a production middleware incident in the live workstation, defend your architectural choices, and receive verified ELO calibration.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border text-left font-mono text-xs space-y-2">
                <div className="text-[10px] text-brand font-bold uppercase tracking-wider">
                  SKILLS EVALUATED IN THIS SESSION:
                </div>
                <div className="flex flex-wrap gap-1.5 text-2xs">
                  <span className="px-2 py-1 rounded bg-muted border border-border">Debugging (85%)</span>
                  <span className="px-2 py-1 rounded bg-muted border border-border">APIs & REST (80%)</span>
                  <span className="px-2 py-1 rounded bg-muted border border-border">Authentication Security (90%)</span>
                  <span className="px-2 py-1 rounded bg-muted border border-border">Testing & Edge Cases (75%)</span>
                  <span className="px-2 py-1 rounded bg-muted border border-border">Technical Articulation (80%)</span>
                </div>
              </div>

              <button
                onClick={handleStart}
                className="px-8 py-3 rounded-2xl bg-brand hover:bg-brand-hover text-white font-bold text-sm shadow-md shadow-brand/20 transition-all flex items-center gap-2 mx-auto"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Enter AI Work Interview Simulator</span>
              </button>
            </div>
          ) : interviewStage === 'in_progress' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
              
              {/* Left Panel: AI Interviewer Conversation (6 cols) */}
              <div className="lg:col-span-6 p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-muted/10 min-h-[420px]">
                <div className="space-y-4 overflow-y-auto max-h-[340px] pr-1">
                  <div className="flex items-center gap-2 pb-2 border-b border-border text-xs font-mono">
                    <Bot className="w-4 h-4 text-brand" />
                    <span className="font-bold text-foreground">AI Technical Interviewer</span>
                    <span className="text-2xs text-muted-foreground ml-auto">Stage {currentStep + 1} of 2</span>
                  </div>

                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 text-xs leading-relaxed ${
                      msg.sender === 'ai' ? 'items-start' : 'items-start flex-row-reverse'
                    }`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                        msg.sender === 'ai' ? 'bg-brand text-white' : 'bg-foreground text-background'
                      }`}>
                        {msg.sender === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className={`p-3.5 rounded-2xl max-w-[85%] ${
                        msg.sender === 'ai' 
                          ? 'bg-card border border-border text-foreground shadow-xs' 
                          : 'bg-brand text-white font-medium shadow-xs'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}

                  {isAiThinking && (
                    <div className="flex items-center gap-2 text-2xs font-mono text-muted-foreground animate-pulse p-2">
                      <Bot className="w-3.5 h-3.5 text-brand" />
                      <span>AI Interviewer is analyzing your reasoning & code...</span>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Type your technical response:</span>
                    <button
                      onClick={() => handleSendResponse(currentStep === 0 ? stageData.sampleAnswer : stageData.secondSampleAnswer)}
                      className="text-brand hover:underline font-bold"
                    >
                      Fill Sample Answer ⚡
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={userResponse}
                      onChange={(e) => setUserResponse(e.target.value)}
                      placeholder="Explain your diagnostic approach and architectural reasoning..."
                      className="w-full p-2.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden resize-none font-sans"
                    />
                    <button
                      onClick={() => handleSendResponse()}
                      disabled={!userResponse.trim() || isAiThinking}
                      className="px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shrink-0 flex items-center justify-center disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel: Workstation Context (6 cols) */}
              <div className="lg:col-span-6 flex flex-col justify-between bg-card">
                <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <Code2 className="w-4 h-4 text-brand" />
                    <span>apps/api/src/middleware/checkout-auth.ts</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Live Workstation</span>
                </div>

                <div className="p-4 sm:p-5 font-mono text-xs overflow-x-auto bg-[#0D1117] text-[#E6EDF3] leading-relaxed flex-1">
                  <pre>
                    <code>{stageData.finalCode}</code>
                  </pre>
                </div>

                {/* Bottom Telemetry Bar */}
                <div className="p-3 bg-muted/50 border-t border-border px-4 flex flex-wrap items-center justify-between gap-3 text-2xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-brand" />
                    <span>Time Remaining: 14:22</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground font-bold">
                    <span>Evaluating: Concurrency & Clock-Skew Invariants</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* Evaluated Results View */
            <div className="p-6 sm:p-8 space-y-6 animate-fade-in text-left">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold uppercase text-brand">
                      AI TECHNICAL WORK INTERVIEW • COMPLETED
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Software Engineer Technical Defense
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-xl border border-border hover:bg-muted text-xs font-mono"
                  >
                    Simulate Again
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase">Overall Score</div>
                  <div className="text-2xl font-extrabold text-foreground mt-0.5">
                    88 <span className="text-xs font-normal text-muted-foreground">/ 100</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600">
                  <div className="text-[10px] uppercase font-bold">Career ELO Change</div>
                  <div className="text-2xl font-black flex items-center justify-center gap-1 mt-0.5">
                    <TrendingUp className="w-5 h-5" />
                    <span>+24 ELO</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase">Trajectory</div>
                  <div className="text-sm font-bold text-foreground mt-1.5">
                    416 &rarr; 440 ELO
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border">
                  <div className="text-[10px] text-muted-foreground uppercase">Evidence Status</div>
                  <div className="text-xs font-bold text-emerald-600 mt-1.5">
                    Minted to Vault & Portfolio ✓
                  </div>
                </div>
              </div>

              {/* Strengths & Improvement Areas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <span className="font-bold text-emerald-700 font-mono flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Demonstrated Strengths:</span>
                  </span>
                  <ul className="space-y-1 text-muted-foreground text-2xs">
                    <li>✓ Diagnosed null metadata reference exception immediately</li>
                    <li>✓ Addressed distributed clock-skew race condition with 60s tolerance</li>
                    <li>✓ Clearly articulated security risks of unverified token decoding</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                  <span className="font-bold text-amber-700 font-mono flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Recommended Next Best Action:</span>
                  </span>
                  <p className="text-muted-foreground text-2xs leading-relaxed">
                    &ldquo;Practice distributed rate-limiting and Redis lock contention missions in Arena to further expand your Staff-level backend rating.&rdquo;
                  </p>
                  <Link
                    href="/arena"
                    className="inline-flex items-center gap-1 text-brand font-bold text-2xs hover:underline pt-1"
                  >
                    <span>Practice in Arena</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </section>
  );
}
