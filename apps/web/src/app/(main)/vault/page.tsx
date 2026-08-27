'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Archive,
  Award,
  FileCode,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Building2,
  Lock,
  Share2
} from 'lucide-react';

type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  missionTitle: string;
  difficulty: string;
  score: number;
  skills: Array<{ skillName: string }>;
  visibility: string;
  createdAt: string;
};

export default function VaultPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ user?: { id: string } }>('/api/profile').then(res => {
      if (res.success && res.data.user?.id) {
        api.get<{ items: PortfolioItem[] }>(`/api/portfolio/${res.data.user.id}`).then(pRes => {
          if (pRes.success) {
            setItems(pRes.data.items || []);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
      
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">
          <Archive className="h-3.5 w-3.5 text-brand" />
          <span>VAULT · CAREER PROOF & EVIDENCE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Cryptographic evidence of your actual work.
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-3xl">
          Every passed simulation generates a verifiable portfolio proof record containing evaluation scores, patch logs, and demonstrated competencies for hiring managers.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">Loading verified artifacts...</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center bg-graphite-50/50 space-y-3">
          <Award className="h-8 w-8 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">No portfolio proofs recorded yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Complete your first professional work simulation in Arena to generate permanent evidence.
          </p>
          <div className="pt-2">
            <Link
              href="/arena"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-hover transition-colors"
            >
              Start Arena Simulation →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div key={item.id} className="border border-border rounded-xl bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-3xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Deterministic Score: {item.score}/100
                  </span>
                  <h3 className="text-base font-semibold text-foreground mt-2">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60">
                <div className="text-3xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Evidenced Competencies:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.skills?.map(s => (
                    <span key={s.skillName} className="text-2xs px-2 py-0.5 bg-graphite-100 text-graphite-700 rounded font-mono">
                      {s.skillName}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-2xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Verified by Capabilio Evaluation Engine</span>
                </span>
                <span className="font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
