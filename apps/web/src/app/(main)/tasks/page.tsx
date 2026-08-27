'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  CheckSquare,
  Building2,
  Briefcase,
  ShieldCheck,
  Clock,
  ArrowRight,
  UserCheck,
  Inbox,
  AlertCircle,
  FileCheck2,
  Sparkles,
  CheckCircle2,
  Send,
  Loader2
} from 'lucide-react';

interface CompanyTask {
  id: string;
  title: string;
  description: string;
  companyName: string;
  roleCategory: string;
  difficulty: string;
  status: 'assigned' | 'in_review' | 'completed';
  submissionNote?: string | null;
  dueDays: number;
}

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<'assigned' | 'in_review' | 'completed'>('assigned');
  const [tasks, setTasks] = useState<CompanyTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Submission modal
  const [activeTask, setActiveTask] = useState<CompanyTask | null>(null);
  const [submissionNote, setSubmissionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await api.get<{ tasks: CompanyTask[] }>('/api/tasks');
      if (res.success && res.data?.tasks) {
        setTasks(res.data.tasks);
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitTaskProof() {
    if (!activeTask) return;
    setSubmitting(true);
    try {
      const nextStatus = activeTask.status === 'assigned' ? 'in_review' : 'completed';
      const res = await api.post<{ task: CompanyTask }>('/api/tasks', {
        taskId: activeTask.id,
        status: nextStatus,
        submissionNote: submissionNote || 'Completed work deliverable submitted for evaluation.',
      });

      if (res.success && res.data?.task) {
        setTasks(prev => prev.map(t => t.id === activeTask.id ? res.data.task : t));
        setActiveTask(null);
        setSubmissionNote('');
      }
    } catch (e) {
      console.error('Task update failed:', e);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredTasks = tasks.filter(t => t.status === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
      
      {/* Editorial Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
          <CheckSquare className="h-3.5 w-3.5 text-brand" />
          <span>TASKS · COMPANY ASSIGNMENTS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Turn real work into career proof.
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">
          Unlike Arena simulations, Tasks are real work samples and technical evaluations directly assigned to you by verified hiring managers and companies.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        {(['assigned', 'in_review', 'completed'] as const).map(tab => {
          const count = tasks.filter(t => t.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-xl font-bold capitalize transition-colors flex items-center gap-2',
                activeTab === tab
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground'
              )}
            >
              <span>{tab.replace('_', ' ')}</span>
              <span className={cn('text-2xs px-1.5 py-0.2 rounded-full', activeTab === tab ? 'bg-white/20 text-white' : 'bg-muted text-foreground')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-card text-xs text-muted-foreground space-y-2">
            <Inbox className="w-8 h-8 mx-auto text-muted-foreground/60" />
            <p>No tasks currently in {activeTab.replace('_', ' ')} status.</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-foreground">{task.companyName}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-2xs font-mono px-2 py-0.5 bg-brand/10 text-brand rounded font-semibold">
                      {task.roleCategory}
                    </span>
                    <span className="text-2xs font-mono px-2 py-0.5 bg-muted text-muted-foreground rounded">
                      Due in {task.dueDays} days
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">{task.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                </div>

                <div className="shrink-0 pt-2 sm:pt-0">
                  {task.status === 'assigned' && (
                    <button
                      onClick={() => setActiveTask(task)}
                      className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Deliverable</span>
                    </button>
                  )}

                  {task.status === 'in_review' && (
                    <button
                      onClick={() => setActiveTask(task)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Complete</span>
                    </button>
                  )}

                  {task.status === 'completed' && (
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified & Approved</span>
                    </div>
                  )}
                </div>
              </div>

              {task.submissionNote && (
                <div className="p-3 bg-muted/40 border border-border/80 rounded-xl text-xs text-muted-foreground space-y-0.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-foreground block">
                    SUBMISSION NOTES:
                  </span>
                  <p>{task.submissionNote}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Task Submission Modal */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-brand font-bold">
                SUBMIT WORK DELIVERABLE
              </span>
              <h3 className="text-lg font-bold text-foreground">{activeTask.title}</h3>
              <p className="text-xs text-muted-foreground">Company: {activeTask.companyName}</p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-foreground">Deliverable Notes / Solution Overview</label>
              <textarea
                value={submissionNote}
                onChange={e => setSubmissionNote(e.target.value)}
                placeholder="Describe your implementation, tests passed, or link your repository proof..."
                rows={4}
                className="w-full p-3 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setActiveTask(null)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTaskProof}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit for Review</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
