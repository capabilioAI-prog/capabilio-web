'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { 
  GraduationCap, 
  BookOpen, 
  Search, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Target, 
  Sparkles, 
  ChevronRight, 
  Zap, 
  TrendingUp, 
  Check, 
  AlertCircle,
  HelpCircle,
  BarChart3,
  Award
} from 'lucide-react';

interface Question {
  id: string;
  orderIndex: number;
  roleSlug: string;
  skillSlug: string;
  skillName: string;
  difficulty: 'easy' | 'applied' | 'scenario' | 'challenging';
  questionType: string;
  question: string;
  scenario?: string | null;
  codeSnippet?: string | null;
  options: string[];
  timeLimitSeconds: number;
}

interface QuestionReview {
  id: string;
  orderIndex: number;
  skillSlug: string;
  skillName: string;
  difficulty: string;
  questionType: string;
  question: string;
  scenario?: string | null;
  codeSnippet?: string | null;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

interface SkillScore {
  skillSlug: string;
  skillName: string;
  score: number;
  questionsCount: number;
  correctCount: number;
  status: 'Strong' | 'Developing' | 'Needs Work';
}

interface CalibrationResults {
  assessmentId: string;
  role: { id: string; name: string; slug: string };
  startingElo: number;
  finalElo: number;
  eloChange: number;
  score: number;
  totalQuestions: number;
  accuracy: number;
  skillScores: SkillScore[];
  strengths: string[];
  weaknesses: string[];
  aiFeedback: {
    summary: string;
    strengthsNote: string;
    weaknessesNote: string;
    nextLearningAction: string;
  };
  questionReview: QuestionReview[];
}

export default function CareerCalibrationPage() {
  const router = useRouter();

  // Wizard state: 'select-role' | 'modal' | 'assessing' | 'results'
  const [step, setStep] = useState<'select-role' | 'assessing' | 'results'>('select-role');
  
  // Profile & Role State
  const [collegeName, setCollegeName] = useState('University');
  const [stream, setStream] = useState('Engineering');
  const [rolesList, setRolesList] = useState<Array<{ id: string; name: string; slug: string; description?: string }>>([]);
  const [searchRole, setSearchRole] = useState('');
  const [selectedRole, setSelectedRole] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Assessment Engine State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Results State
  const [results, setResults] = useState<CalibrationResults | null>(null);
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<SkillScore | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect'>('all');

  // Load Roles & Profile
  useEffect(() => {
    Promise.all([
      api.get<{ roles: Array<{ id: string; name: string; slug: string; description?: string }> }>('/api/roles'),
      api.get<{ profile?: { collegeName?: string; stream?: string; hasCompletedCareerOnboarding?: boolean } }>('/api/profile')
    ]).then(([rolesRes, profileRes]) => {
      if (rolesRes.success && rolesRes.data?.roles) {
        setRolesList(rolesRes.data.roles);
        const defaultRole = rolesRes.data.roles.find(r => r.slug === 'data-analyst') || rolesRes.data.roles[0];
        if (defaultRole) setSelectedRole(defaultRole);
      }
      if (profileRes.success && profileRes.data?.profile) {
        if (profileRes.data.profile.collegeName) setCollegeName(profileRes.data.profile.collegeName);
        if (profileRes.data.profile.stream) setStream(profileRes.data.profile.stream);
      }
    });
  }, []);

  // Timer Effect during assessment
  useEffect(() => {
    if (step !== 'assessing' || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto advance to next question
          handleNextQuestion();
          return questions[currentIndex + 1]?.timeLimitSeconds || 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, currentIndex, questions]);

  // Start Assessment Handler
  async function handleStartAssessment(role: { id: string; name: string; slug: string }) {
    setSelectedRole(role);
    setShowRoleModal(false);
    
    try {
      const res = await api.get<{ questions: Question[]; collegeName?: string; stream?: string }>(`/api/onboarding/calibration?roleSlug=${role.slug}`);
      if (res.success && res.data?.questions?.length) {
        setQuestions(res.data.questions);
        setCurrentIndex(0);
        setAnswers({});
        setTimeLeft(res.data.questions[0]?.timeLimitSeconds || 60);
        setStep('assessing');
      }
    } catch (e) {
      console.error('Failed to load questions:', e);
    }
  }

  function handleSelectOption(option: string) {
    const q = questions[currentIndex];
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: option }));
  }

  function handleNextQuestion() {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setTimeLeft(questions[nextIdx]?.timeLimitSeconds || 60);
    } else {
      setShowSubmitConfirm(true);
    }
  }

  function handlePrevQuestion() {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setTimeLeft(questions[prevIdx]?.timeLimitSeconds || 60);
    }
  }

  async function handleSubmitAssessment() {
    if (!selectedRole) return;
    setIsSubmitting(true);
    setShowSubmitConfirm(false);

    try {
      const res = await api.post<CalibrationResults>('/api/onboarding/calibration', {
        roleSlug: selectedRole.slug,
        answers,
      });

      if (res.success && res.data) {
        setResults(res.data);
        setStep('results');
      }
    } catch (e) {
      console.error('Submission failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredRoles = rolesList.filter(r => 
    r.name.toLowerCase().includes(searchRole.toLowerCase())
  );

  // ----------------------------------------------------
  // 1. STEP 1: CAREER ROLE SELECTION
  // ----------------------------------------------------
  if (step === 'select-role') {
    return (
      <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Header Banner */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-card via-card to-brand/5 border border-border shadow-xl space-y-4 text-center sm:text-left relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
                <GraduationCap className="w-4 h-4" />
                <span>BUILD YOUR CAREER PROFILE</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                <span>College: <strong className="text-foreground">{collegeName}</strong></span>
                <span>•</span>
                <span>Stream: <strong className="text-foreground">{stream}</strong></span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                What career are you preparing for?
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                Select your target career role to begin your 25-question Career Calibration Assessment. This establishes your initial baseline ELO (400), Skill Graph, and customized Arena missions.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative pt-2">
              <Search className="w-4 h-4 absolute left-3.5 top-5 text-muted-foreground" />
              <input
                type="text"
                value={searchRole}
                onChange={e => setSearchRole(e.target.value)}
                placeholder="Search career roles (e.g. Data Analyst, Software Engineer, Cybersecurity...)"
                className="w-full pl-10 pr-4 py-3 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
              />
            </div>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map(role => (
              <div
                key={role.id}
                onClick={() => {
                  setSelectedRole(role);
                  setShowRoleModal(true);
                }}
                className="p-5 rounded-2xl border border-border bg-card hover:border-brand/60 hover:shadow-lg cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold">
                      Starting ELO: 400
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      25 Questions
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-brand transition-colors">
                    {role.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {role.description || `Entry-level career track and work simulation for aspiring ${role.name}s.`}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/80 text-xs font-semibold text-brand">
                  <span>Start Career Calibration</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Career Calibration Modal Confirmation */}
        {showRoleModal && selectedRole && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xl animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-2">
                  <Target className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-brand">
                  CAREER CALIBRATION
                </span>
                <h2 className="text-xl font-bold text-foreground">
                  {selectedRole.name}
                </h2>
                <div className="flex items-center justify-center gap-3 text-xs font-mono text-muted-foreground pt-1">
                  <span>Starting ELO: <strong className="text-brand">400</strong></span>
                  <span>•</span>
                  <span>Assessment: <strong>25 Questions</strong></span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs text-muted-foreground leading-relaxed text-center">
                <p>
                  &ldquo;We&apos;ll use this assessment to establish your initial career skill profile, identify your strengths and gaps, and calibrate your first Arena workstation tickets.&rdquo;
                </p>
                <div className="text-[11px] font-mono text-foreground font-semibold pt-1">
                  Progressive difficulty • 100% Fresher appropriate
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => handleStartAssessment(selectedRole)}
                  className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Start Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. STEP 2: 25-QUESTION ASSESSMENT ENGINE
  // ----------------------------------------------------
  if (step === 'assessing') {
    const q = questions[currentIndex];
    const selectedAns = q ? answers[q.id] : undefined;
    const progressPct = Math.round(((currentIndex + 1) / Math.max(1, questions.length)) * 100);

    return (
      <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-6">
          
          {/* Assessment Header */}
          <div className="p-5 sm:p-6 rounded-2xl border border-border bg-card shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
                  <Target className="w-3.5 h-3.5" />
                  <span>CAPABILIO • Career Calibration</span>
                </div>
                <h2 className="text-base font-bold text-foreground mt-0.5">
                  {selectedRole?.name} Track
                </h2>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-xs font-mono text-muted-foreground">
                  Starting ELO: <strong className="text-foreground">400</strong>
                </div>
                <div className={`px-3 py-1 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 ${
                  timeLeft <= 15 ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse' : 'bg-muted border-border text-foreground'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeLeft}s remaining</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span className="text-brand font-semibold">{progressPct}% Completed</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question Card */}
          {q && (
            <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xl space-y-6 animate-fade-in">
              
              {/* Question Metadata Tags */}
              <div className="flex items-center justify-between pb-3 border-b border-border/80 text-xs">
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-muted text-foreground font-semibold">
                  Skill: {q.skillName}
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                  q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-600' :
                  q.difficulty === 'applied' ? 'bg-blue-500/10 text-blue-600' :
                  q.difficulty === 'scenario' ? 'bg-amber-500/10 text-amber-600' :
                  'bg-purple-500/10 text-purple-600'
                }`}>
                  {q.difficulty} Tier (1/3 Rule)
                </span>
              </div>

              {/* Scenario Context if present */}
              {q.scenario && (
                <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-1 text-xs text-foreground leading-relaxed">
                  <span className="font-mono text-[10px] uppercase font-bold text-brand block">
                    SCENARIO CONTEXT
                  </span>
                  <p className="italic">{q.scenario}</p>
                </div>
              )}

              {/* Code Snippet if present */}
              {q.codeSnippet && (
                <div className="p-4 rounded-xl bg-graphite-950 border border-border/60 text-graphite-100 font-mono text-xs overflow-x-auto">
                  <pre>{q.codeSnippet}</pre>
                </div>
              )}

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                {q.question}
              </h3>

              {/* 4 Option Buttons */}
              <div className="space-y-3 pt-2">
                {q.options.map((option, idx) => {
                  const isSelected = selectedAns === option;
                  const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

                  return (
                    <div
                      key={option}
                      onClick={() => handleSelectOption(option)}
                      className={`p-4 rounded-2xl border text-xs font-sans cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-brand bg-brand/10 text-foreground shadow-xs'
                          : 'border-border bg-muted/20 hover:border-border hover:bg-muted/40 text-foreground'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-brand text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {optionLabel}
                      </span>
                      <span className="leading-relaxed mt-0.5 font-medium">{option}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border/80">
                <button
                  onClick={handlePrevQuestion}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                  >
                    <span>Save & Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Review & Submit Assessment</span>
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xl animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Submit Career Calibration?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You have answered {Object.keys(answers).length} of {questions.length} questions. You won&apos;t be able to change your answers after submission.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors"
                >
                  Review Answers
                </button>
                <button
                  onClick={handleSubmitAssessment}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Evaluating 1/3 ELO...' : 'Confirm & Submit'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. STEP 3: CAREER CALIBRATION RESULTS VIEW
  // ----------------------------------------------------
  if (step === 'results' && results) {
    const filteredReviews = results.questionReview.filter(q => {
      if (reviewFilter === 'correct') return q.isCorrect;
      if (reviewFilter === 'incorrect') return !q.isCorrect;
      return true;
    });

    return (
      <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-card via-card to-brand/10 border-2 border-brand/40 shadow-xl space-y-6 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
                <Award className="w-4 h-4" />
                <span>CAREER CALIBRATION COMPLETE</span>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-md bg-brand/10 text-brand font-bold">
                Role Track: {results.role.name}
              </span>
            </div>

            {/* Main Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1 text-center">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Starting ELO</span>
                <div className="text-xl font-bold font-mono text-muted-foreground">{results.startingElo}</div>
              </div>

              <div className="p-4 rounded-2xl bg-brand/10 border border-brand/30 space-y-1 text-center">
                <span className="text-[10px] font-mono uppercase text-brand font-bold">Calibrated ELO</span>
                <div className="text-2xl font-bold font-mono text-foreground">{results.finalElo}</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1 text-center">
                <span className="text-[10px] font-mono uppercase text-emerald-600 font-bold">ELO Movement</span>
                <div className="text-2xl font-bold font-mono text-emerald-600">+{results.eloChange}</div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-1 text-center">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Score & Accuracy</span>
                <div className="text-xl font-bold font-mono text-foreground">{results.score}/{results.totalQuestions} ({results.accuracy}%)</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="text-xs text-muted-foreground max-w-xl">
                Your entry baseline has been established via the Capabilio 1/3 scoring engine. This data now drives your living Aura dashboard and Arena workstations.
              </p>
              <button
                onClick={() => {
                  router.push('/aura');
                  router.refresh();
                }}
                className="px-6 py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2"
              >
                <span>Continue to Aura Career OS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Skill Graph & Performance Diagnostic */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Assessed Skill Scores */}
            <div className="lg:col-span-6 p-6 rounded-3xl border border-border bg-card shadow-md space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand" />
                  <span>Assessed Skill Graph</span>
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground">Click skill to inspect</span>
              </div>

              <div className="space-y-3">
                {results.skillScores.map(skill => (
                  <div
                    key={skill.skillSlug}
                    onClick={() => setSelectedSkillDetail(skill)}
                    className="p-3.5 rounded-xl bg-muted/30 border border-border hover:border-brand/40 cursor-pointer space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{skill.skillName}</span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          skill.status === 'Strong' ? 'bg-emerald-500/10 text-emerald-600' :
                          skill.status === 'Developing' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-amber-500/10 text-amber-600'
                        }`}>
                          {skill.status}
                        </span>
                        <span className="font-bold text-foreground">{skill.score}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand rounded-full transition-all duration-500"
                        style={{ width: `${skill.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Synthesis & Feedback */}
            <div className="lg:col-span-6 p-6 rounded-3xl border border-border bg-card shadow-md space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-brand">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Performance Synthesis</span>
                </div>

                <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border/80">
                  {results.aiFeedback.summary}
                </p>

                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase text-emerald-600 block">
                    Demonstrated Strengths
                  </span>
                  <div className="space-y-1 text-xs text-foreground">
                    {results.strengths.map((str, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase text-amber-600 block">
                    Primary Growth Areas
                  </span>
                  <div className="space-y-1 text-xs text-foreground">
                    {results.weaknesses.map((wk, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{wk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/80">
                <Link
                  href="/arena"
                  className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold text-center block transition-colors shadow-xs"
                >
                  Practice Identified Gaps in Arena →
                </Link>
              </div>
            </div>

          </div>

          {/* Full 25 Question Review */}
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-md space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Question Review ({results.totalQuestions} Questions)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed engineering explanations for all calibration questions.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {(['all', 'correct', 'incorrect'] as const).map(flt => (
                  <button
                    key={flt}
                    onClick={() => setReviewFilter(flt)}
                    className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                      reviewFilter === flt
                        ? 'bg-brand text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {flt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredReviews.map((q, idx) => (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border text-xs space-y-3 transition-all ${
                    q.isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-foreground">
                      Question {q.orderIndex} • {q.skillName}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] flex items-center gap-1 ${
                      q.isCorrect ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'
                    }`}>
                      {q.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{q.isCorrect ? 'Correct' : 'Incorrect'}</span>
                    </span>
                  </div>

                  {q.scenario && (
                    <div className="p-3 rounded-lg bg-muted/40 italic text-muted-foreground text-[11px]">
                      {q.scenario}
                    </div>
                  )}

                  <p className="font-semibold text-foreground">{q.question}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2.5 rounded-lg bg-background border border-border">
                      <span className="text-muted-foreground block text-[10px] font-mono">YOUR ANSWER:</span>
                      <span className={q.isCorrect ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {q.userAnswer || '(No answer selected)'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-background border border-border">
                      <span className="text-muted-foreground block text-[10px] font-mono">CORRECT ANSWER:</span>
                      <span className="text-emerald-600 font-semibold">{q.correctAnswer}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-background/80 border border-border/80 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-brand block">
                      ENGINEERING EXPLANATION
                    </span>
                    <p className="text-muted-foreground leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Skill Detail Modal */}
        {selectedSkillDetail && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-semibold">
                    Skill Calibration Diagnostic
                  </span>
                  <h3 className="text-lg font-bold text-foreground">{selectedSkillDetail.skillName}</h3>
                </div>
                <button
                  onClick={() => setSelectedSkillDetail(null)}
                  className="text-muted-foreground hover:text-foreground text-xs p-1 rounded hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-muted/40 rounded-xl flex items-center justify-between">
                  <span className="text-muted-foreground">Assessed Score</span>
                  <span className="font-bold font-mono text-foreground text-sm">{selectedSkillDetail.score}%</span>
                </div>

                <div className="p-3.5 bg-muted/40 rounded-xl flex items-center justify-between">
                  <span className="text-muted-foreground">Performance Record</span>
                  <span className="font-semibold text-foreground">
                    {selectedSkillDetail.correctCount} of {selectedSkillDetail.questionsCount} questions correct
                  </span>
                </div>

                <div className="p-3.5 bg-muted/40 rounded-xl flex items-center justify-between">
                  <span className="text-muted-foreground">Calibration Status</span>
                  <span className="font-bold text-brand">{selectedSkillDetail.status}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/skill-studio"
                  className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold text-center transition-colors"
                >
                  Learn in Studio
                </Link>
                <Link
                  href="/arena"
                  className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold text-center shadow-xs transition-colors"
                >
                  Practice in Arena →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
