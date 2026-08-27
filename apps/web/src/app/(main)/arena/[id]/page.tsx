'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEntitlements } from '@/lib/entitlements-context';
import { api } from '@/lib/api';
import { cn, getDifficultyLabel, getDifficultyColor, formatMinutes } from '@/lib/utils';
import {
  Clock,
  User,
  Building2,
  ArrowRight,
  ChevronLeft,
  AlertCircle,
  FileCode,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Terminal,
  Layers,
  HelpCircle,
  Play
} from 'lucide-react';

type MissionRequirement = {
  id: string;
  description: string;
  isRequired: boolean;
  weight: number;
};

type Mission = {
  id: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  role: { name: string };
  company: { name: string; industry: string; size: string; description: string } | null;
  managerName: string;
  managerTitle: string;
  department: string;
  sprint: string;
  businessContext: string;
  problemStatement: string;
  requirements: MissionRequirement[];
  acceptanceCriteria: string[];
  availableTools: string[];
  expectedDeliverable: string;
  referenceDocumentation: string | null;
  missionSkills: Array<{ skill: { name: string; category: string } }>;
};

export default function MissionDetailPage({ params }: { params: { id: string } }) {
  const { openUpgradeModal } = useEntitlements();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ mission: Mission }>(`/api/missions/${params.id}`).then(res => {
      if (res.success) {
        setMission(res.data.mission);
      }
      setLoading(false);
    });
  }, [params.id]);

  async function handleStart() {
    if (!mission) return;
    setStarting(true);
    setError('');
    try {
      const res = await api.post<{ submission: { id: string }; starterFiles: Record<string, string> }>(
        `/api/missions/${mission.id}/start`,
        {}
      );
      if (res.success && res.data.submission) {
        router.push(`/arena/${mission.id}/workspace?submissionId=${res.data.submission.id}`);
      } else {
        const errMsg = (res as any).error?.message || 'Failed to initialize workstation. Please try again.';
        setError(errMsg);
        if ((res as any).error?.code === 'DAILY_ARENA_LIMIT_EXCEEDED') {
          openUpgradeModal('arena_limit');
        }
        setStarting(false);
      }
    } catch {
      setError('An error occurred starting the mission.');
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-xs text-muted-foreground">
        Loading mission briefing memo...
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-semibold text-foreground">Mission not found</h2>
        <Link href="/arena" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
          <ChevronLeft className="h-3 w-3" /> Back to Arena
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/arena" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> Arena Simulation
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-sm">{mission.title}</span>
      </div>

      {/* Manager Assignment Briefing Header */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
        
        {/* Dark Memo Bar */}
        <div className="bg-graphite-950 text-white p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('text-2xs px-2 py-0.5 rounded border font-semibold', getDifficultyColor(mission.difficulty))}>
                  {getDifficultyLabel(mission.difficulty)}
                </span>
                <span className="text-2xs font-bold uppercase tracking-wider text-graphite-400 bg-graphite-900 px-2 py-0.5 rounded">
                  {mission.sprint}
                </span>
                <span className="text-2xs font-medium text-emerald-400">
                  +24 ELO Reward
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                {mission.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-graphite-300 pt-1">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-brand" />
                  <span>Assigner: <strong className="text-white">{mission.managerName}</strong> ({mission.managerTitle})</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-graphite-400" />
                  <span>{mission.company?.name} · {mission.department}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-graphite-400" />
                  <span>{formatMinutes(mission.estimatedMinutes)}</span>
                </div>
              </div>

            </div>

            {/* Launch Action */}
            <div className="shrink-0 pt-2 md:pt-0">
              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-bold tracking-wide transition-colors shadow-md group disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>{starting ? 'INITIALIZING WORKSPACE...' : 'ENTER WORKSTATION'}</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              {error && <p className="text-2xs text-rose-400 mt-2 text-center">{error}</p>}
            </div>

          </div>
        </div>

        {/* Executive Memo Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Business Context & Incident Report */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-4 w-4 text-brand" />
              <span>Business Context & Incident Memo</span>
            </div>
            <div className="p-4 rounded-lg bg-graphite-50 border border-border text-xs text-graphite-800 leading-relaxed space-y-2">
              <p>{mission.businessContext}</p>
              <div className="pt-2 border-t border-border/80 text-2xs text-muted-foreground flex items-center gap-2">
                <span className="font-semibold text-foreground">Virtual Organization:</span>
                <span>{mission.company?.name} — {mission.company?.description}</span>
              </div>
            </div>
          </div>

          {/* Problem Statement */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>Problem Statement</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed pl-1">
              {mission.problemStatement}
            </p>
          </div>

          {/* Technical Requirements & Acceptance Criteria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Requirements */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Ticket Requirements</span>
              </div>
              <div className="space-y-2">
                {mission.requirements?.map((req, i) => (
                  <div key={req.id || i} className="p-3 rounded-lg border border-border bg-background flex items-start gap-2.5 text-xs">
                    <span className="w-5 h-5 rounded-full bg-graphite-100 text-graphite-700 font-mono text-3xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      0{i + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="text-foreground">{req.description}</span>
                      {req.isRequired && (
                        <span className="ml-2 text-3xs uppercase font-bold text-brand bg-brand/10 px-1 py-0.2 rounded">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acceptance Criteria */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Acceptance Criteria</span>
              </div>
              <div className="space-y-2">
                {mission.acceptanceCriteria?.map((ac, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-background flex items-start gap-2.5 text-xs text-graphite-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{ac}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Expected Deliverable & Skills Evidenced */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            
            <div className="space-y-2">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Expected Deliverables</span>
              <div className="p-3 rounded-lg bg-graphite-50 border border-border text-xs text-foreground">
                {mission.expectedDeliverable || 'Clean patch fixing validation regression with 100% passing tests and an authored engineering investigation note.'}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Skills Proven Upon Passing</span>
              <div className="flex flex-wrap gap-1.5">
                {mission.missionSkills?.map(ms => (
                  <span key={ms.skill.name} className="px-2.5 py-1 bg-graphite-100 text-graphite-800 rounded-md text-2xs font-medium border border-border">
                    {ms.skill.name}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
