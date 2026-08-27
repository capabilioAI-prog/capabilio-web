'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  Bot, 
  User, 
  Send, 
  Play, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Code2, 
  Database, 
  AlertCircle, 
  Mic, 
  MicOff, 
  ArrowRight,
  Terminal,
  Activity
} from 'lucide-react';

interface TranscriptItem {
  sender: 'ai' | 'candidate';
  message: string;
  timestamp: string;
  stage?: string;
  telemetry?: {
    technicalScore?: number;
    reasoningScore?: number;
    communicationScore?: number;
  };
}

interface LiveTaskState {
  id: string;
  title: string;
  prompt: string;
  timeLimitMinutes: number;
  starterSql: string;
  expectedPattern: string;
  expectedDeduplication: boolean;
  requiredColumns: string[];
}

export default function LiveInterviewWorkstationPage() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Live Task State
  const [currentStage, setCurrentStage] = useState('opener');
  const [liveTask, setLiveTask] = useState<LiveTaskState | null>(null);
  const [liveSql, setLiveSql] = useState('');
  const [executingQuery, setExecutingQuery] = useState(false);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Telemetry
  const [telemetry, setTelemetry] = useState({
    technicalScore: 82,
    reasoningScore: 78,
    communicationScore: 85,
  });

  // Countdown (15 minutes)
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadInterview() {
      try {
        const res = await fetch(`http://localhost:3001/api/interview/${interviewId}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.interview) {
            const intv = data.data.interview;
            setSession(intv);
            if (Array.isArray(intv.transcript)) {
              setTranscript(intv.transcript);
              const lastMsg = intv.transcript[intv.transcript.length - 1];
              if (lastMsg?.stage) setCurrentStage(lastMsg.stage);
            }
          }
        }
      } catch (err) {
        console.error('Error loading interview session:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInterview();
  }, [interviewId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web Speech API
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type your response directly.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setInputText(prev => prev ? `${prev} ${speechResult}` : speechResult);
        setIsRecording(false);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;
    const msg = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistically update transcript
    const userMsg: TranscriptItem = {
      sender: 'candidate',
      message: msg,
      timestamp: new Date().toISOString(),
      stage: currentStage,
    };
    setTranscript(prev => [...prev, userMsg]);

    try {
      const res = await fetch(`http://localhost:3001/api/interview/${interviewId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: msg,
          currentStage,
          questionIndex: transcript.length + 1,
          liveTaskSql: liveSql,
        }),
      });

      const data = await res.json();
      if (res.ok && data.data) {
        if (data.data.nextStage) setCurrentStage(data.data.nextStage);
        if (data.data.telemetry) setTelemetry(data.data.telemetry);
        if (data.data.liveTask) {
          setLiveTask(data.data.liveTask);
          setLiveSql(data.data.liveTask.starterSql);
        }

        const aiMsg: TranscriptItem = {
          sender: 'ai',
          message: data.data.response,
          timestamp: new Date().toISOString(),
          stage: data.data.nextStage,
          telemetry: data.data.telemetry,
        };
        setTranscript(prev => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error('Error sending response:', err);
    } finally {
      setSending(false);
    }
  };

  const handleExecuteLiveQuery = async () => {
    setExecutingQuery(true);
    setQueryError(null);
    try {
      const res = await fetch('http://localhost:3001/api/arena/execute-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sql: liveSql }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setQueryResults(data.data.rows || []);
      } else {
        setQueryError(data.error?.message || 'Query execution failed');
      }
    } catch (err: any) {
      setQueryError(err.message || 'Execution error');
    } finally {
      setExecutingQuery(false);
    }
  };

  const handleCompleteInterview = async () => {
    setFinishing(true);
    try {
      const res = await fetch(`http://localhost:3001/api/interview/${interviewId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          taskData: {
            sql: liveSql,
            results: queryResults,
            errors: queryError,
          },
          durationMinutes: Math.round((15 * 60 - secondsRemaining) / 60) || 1,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/interview/${interviewId}/results`);
      } else {
        alert(data.error?.message || 'Failed to finalize interview');
        setFinishing(false);
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
      setFinishing(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <header className="border-b border-border bg-card px-4 sm:px-8 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/interview" className="text-xs font-mono font-bold text-muted-foreground hover:text-foreground">
            ← INTERVIEW HUB
          </Link>
          <span className="text-border">/</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-foreground">
              {session?.roleTitle || 'DATA ANALYST'} TECHNICAL INTERVIEW
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted border border-border text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5 text-brand" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          <button
            onClick={handleCompleteInterview}
            disabled={finishing}
            data-testid="finish-interview-btn"
            className="px-4 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-mono font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            {finishing ? (
              <span>EVALUATING WORK...</span>
            ) : (
              <>
                <span>FINISH & EVALUATE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </header>

      {/* 3-Column Interview Layout */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Stages & Context */}
        <div className="col-span-12 md:col-span-3 border-r border-border bg-card p-4 sm:p-6 overflow-y-auto space-y-6 hidden md:block">
          <div className="space-y-1">
            <div className="text-2xs font-mono font-bold uppercase text-brand">SESSION STAGE</div>
            <h3 className="font-bold text-sm text-foreground">Evaluation Pipeline</h3>
          </div>

          <div className="space-y-2">
            {[
              { id: 'opener', label: '1. Arena Evidence Defense' },
              { id: 'live_task', label: '2. Live SQL Sandbox Task' },
              { id: 'wrapup', label: '3. Executive Communication' },
              { id: 'completed', label: '4. Verified Evaluation' },
            ].map((st) => {
              const isCurrent = currentStage === st.id;
              return (
                <div
                  key={st.id}
                  className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                    isCurrent 
                      ? 'border-brand bg-brand/10 text-brand font-bold' 
                      : 'border-border bg-muted/20 text-muted-foreground'
                  }`}
                >
                  <span>{st.label}</span>
                  {isCurrent && <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-border space-y-3 font-mono text-xs">
            <div className="text-2xs text-muted-foreground uppercase font-bold">INTERVIEW GUARDRAILS</div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground space-y-1 leading-relaxed">
              <div>• Questions anchored in real Arena work</div>
              <div>• AI Mentor will not solve query for candidate</div>
              <div>• Strict sandbox isolation enabled</div>
            </div>
          </div>
        </div>

        {/* Center Column: Interactive Interview & Live Task Playground */}
        <div className="col-span-12 md:col-span-6 flex flex-col h-full bg-background overflow-hidden border-r border-border">
          {/* Transcript Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {transcript.map((item, idx) => {
              const isAi = item.sender === 'ai';
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`p-4 rounded-2xl max-w-xl text-xs sm:text-sm leading-relaxed ${
                      isAi
                        ? 'bg-card border border-border text-foreground'
                        : 'bg-brand text-white'
                    }`}
                  >
                    <div className="text-[10px] font-mono opacity-60 mb-1">
                      {isAi ? 'AI INTERVIEWER' : 'YOU (CANDIDATE)'} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="whitespace-pre-wrap">{item.message}</div>
                  </div>

                  {!isAi && (
                    <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-foreground" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Task Playground in Center Column */}
            {liveTask && (
              <div className="my-4 p-5 rounded-3xl border-2 border-brand/40 bg-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-brand" />
                    <h4 className="font-bold text-xs font-mono text-foreground uppercase">
                      {liveTask.title}
                    </h4>
                  </div>
                  <span className="text-2xs font-mono px-2.5 py-0.5 rounded bg-brand/10 text-brand font-bold border border-brand/20">
                    LIVE EXECUTION SANDBOX
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {liveTask.prompt}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground">
                    <span>SQL EDITOR</span>
                    <span>Tables: subscriptions, invoice_events</span>
                  </div>
                  <textarea
                    value={liveSql}
                    onChange={(e) => setLiveSql(e.target.value)}
                    data-testid="live-task-sql-editor"
                    rows={6}
                    className="w-full p-3 rounded-2xl bg-muted/40 border border-border font-mono text-xs text-foreground focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleExecuteLiveQuery}
                    disabled={executingQuery}
                    data-testid="run-live-query-btn"
                    className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-mono font-bold hover:bg-foreground/90 transition-all flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-background" />
                    <span>{executingQuery ? 'RUNNING...' : 'EXECUTE QUERY'}</span>
                  </button>

                  <span className="text-2xs font-mono text-muted-foreground">
                    Query will be evaluated live by AI interviewer
                  </span>
                </div>

                {queryError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-mono">
                    ⚠ Execution Error: {queryError}
                  </div>
                )}

                {queryResults && queryResults.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-2xs font-mono text-muted-foreground font-bold">PREVIEW RESULTS ({queryResults.length} ROWS):</div>
                    <div className="max-h-36 overflow-auto rounded-xl border border-border bg-muted/30 p-2 font-mono text-[11px]">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            {Object.keys(queryResults[0] || {}).map((col) => (
                              <th key={col} className="p-1">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResults.slice(0, 4).map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-border/40">
                              {Object.values(row).map((val: any, cIdx) => (
                                <td key={cIdx} className="p-1">{String(val)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Response Input Box */}
          <div className="p-4 border-t border-border bg-card space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder="Type your response to the AI interviewer..."
                data-testid="interview-input"
                className="flex-1 px-4 py-3 rounded-2xl bg-muted/40 border border-border text-xs sm:text-sm text-foreground focus:outline-none focus:border-brand"
              />

              <button
                type="button"
                onClick={toggleSpeechRecognition}
                title={isRecording ? 'Stop Recording' : 'Voice Input'}
                className={`p-3 rounded-2xl border transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white border-red-600 animate-pulse' 
                    : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={sending || !inputText.trim()}
                data-testid="send-interview-msg-btn"
                className="px-5 py-3 rounded-2xl bg-brand hover:bg-brand-hover text-white text-xs font-bold font-mono transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>SEND</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-2xs font-mono text-muted-foreground">
              <span>Press [Enter] to submit response</span>
              <span>Speech-to-text enabled</span>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Candidate Telemetry */}
        <div className="col-span-12 md:col-span-3 bg-card p-4 sm:p-6 overflow-y-auto space-y-6 hidden md:block">
          <div className="space-y-1 pb-3 border-b border-border">
            <div className="flex items-center gap-1.5 text-2xs font-mono font-bold uppercase text-brand">
              <Activity className="w-3.5 h-3.5" />
              <span>REAL-TIME TELEMETRY</span>
            </div>
            <h3 className="font-bold text-sm text-foreground">Candidate Signals</h3>
          </div>

          {/* Metric Bars */}
          <div className="space-y-4">
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">TECHNICAL DEPTH</span>
                <span className="font-bold text-foreground">{telemetry.technicalScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${telemetry.technicalScore}%` }} />
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">REASONING & LOGIC</span>
                <span className="font-bold text-foreground">{telemetry.reasoningScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${telemetry.reasoningScore}%` }} />
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">COMMUNICATION</span>
                <span className="font-bold text-foreground">{telemetry.communicationScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${telemetry.communicationScore}%` }} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-3 font-mono text-xs">
            <div className="text-2xs text-muted-foreground uppercase font-bold">VERIFIED EVIDENCE LINK</div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border text-[11px] text-muted-foreground space-y-1.5">
              <div className="font-bold text-foreground">Target Role: {session?.roleTitle || 'Data Analyst'}</div>
              <div>Arena Missions Linked: ✓</div>
              <div>SHA-256 Proof Minting: ✓</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
