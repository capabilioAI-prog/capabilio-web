'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Compass, 
  Target, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Clock,
  Layers,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface AuraSkillsTabProps {
  overviewData: any;
}

export function AuraSkillsTab({ overviewData }: AuraSkillsTabProps) {
  const [selectedSkill, setSelectedSkill] = useState<any | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const skillGraph = overviewData?.skillGraph || [];
  const radarSkills = overviewData?.radarSkills || [];
  const activeRole = overviewData?.activeRole || { name: 'Software Engineer' };

  const filteredSkills = categoryFilter === 'all'
    ? skillGraph
    : skillGraph.filter((s: any) => s.category === categoryFilter);

  const categories = ['all', ...Array.from(new Set(skillGraph.map((s: any) => s.category)))];

  // Radar Chart Calculations
  const radarCount = Math.max(3, radarSkills.length);
  const size = 340;
  const center = size / 2;
  const radius = center - 45;

  const points = radarSkills.map((sk: any, i: number) => {
    const angle = (Math.PI * 2 / radarCount) * i - Math.PI / 2;
    const r = (sk.score / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle, ...sk };
  });

  const polygonPath = points.map((p: any) => `${p.x},${p.y}`).join(' ');

  // Concentric levels
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-brand">
            Role Skill Matrix & Radar
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            Target Track: <strong className="text-foreground">{activeRole.name}</strong>
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          Demonstrated Capability & Interactive Radar Graph
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          Radar dimensions are calibrated exclusively for {activeRole.name}. Proficiency increases with verified Arena mission test passes, AI interviews, and deterministic code reviews.
        </p>
      </div>

      {/* 1. Interactive Radar Chart Component */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Radar SVG */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
          <div className="w-full max-w-[340px] aspect-square relative">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
              {/* Concentric grid rings */}
              {levels.map((lvl) => {
                const ringPoints = Array.from({ length: radarCount }, (_, i) => {
                  const angle = (Math.PI * 2 / radarCount) * i - Math.PI / 2;
                  const r = lvl * radius;
                  return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                }).join(' ');

                return (
                  <polygon
                    key={lvl}
                    points={ringPoints}
                    fill="none"
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth="1"
                    strokeDasharray={lvl === 1.0 ? 'none' : '3 3'}
                  />
                );
              })}

              {/* Axis lines */}
              {Array.from({ length: radarCount }, (_, i) => {
                const angle = (Math.PI * 2 / radarCount) * i - Math.PI / 2;
                const x2 = center + radius * Math.cos(angle);
                const y2 = center + radius * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    className="text-border/80"
                    strokeWidth="1"
                  />
                );
              })}

              {/* User Score Filled Polygon */}
              {points.length > 0 && (
                <polygon
                  points={polygonPath}
                  fill="rgba(255, 87, 1, 0.22)"
                  stroke="#FF5701"
                  strokeWidth="2.5"
                  className="transition-all duration-700 ease-out"
                />
              )}

              {/* Vertex Nodes & Interactive Markers */}
              {points.map((p: any, i: number) => {
                const labelRadius = radius + 22;
                const lx = center + labelRadius * Math.cos(p.angle);
                const ly = center + labelRadius * Math.sin(p.angle);

                return (
                  <g key={i} className="cursor-pointer group" onClick={() => setSelectedSkill({ name: p.dimension, proficiency: p.score, weight: 90, category: 'Core', evidenceCount: p.evidenceCount })}>
                    {/* Vertex Dot */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill="#FF5701"
                      stroke="#fff"
                      strokeWidth="1.5"
                      className="group-hover:r-6 transition-all"
                    />
                    {/* Dimension Label */}
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[10px] font-mono fill-foreground font-semibold group-hover:fill-brand transition-colors"
                    >
                      {p.dimension.length > 14 ? p.dimension.slice(0, 12) + '..' : p.dimension}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground mt-4">
            ● Orange Polygon: Demonstrated {activeRole.name} Competency
          </span>
        </div>

        {/* Right: Radar Competency Highlights */}
        <div className="lg:col-span-6 space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">
              {activeRole.name} Core Competency Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">
              Click any competency node to view verified evidence or launch target practice.
            </p>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {radarSkills.map((sk: any) => (
              <div
                key={sk.dimension}
                onClick={() => setSelectedSkill({ name: sk.dimension, proficiency: sk.score, weight: 90, category: 'Core', evidenceCount: sk.evidenceCount })}
                className="p-3 rounded-xl bg-muted/30 border border-border hover:border-brand/40 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div className="font-semibold text-foreground">{sk.dimension}</div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-[11px] font-mono">{sk.evidenceCount} Proofs</span>
                  <span className="font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded">
                    {sk.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar text-xs">
        {categories.map((cat: any) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={
              categoryFilter === cat
                ? 'px-3.5 py-2 rounded-xl bg-brand text-white font-semibold capitalize whitespace-nowrap shadow-xs transition-colors'
                : 'px-3.5 py-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground capitalize whitespace-nowrap border border-border/50 transition-colors'
            }
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill: any) => (
          <div
            key={skill.id}
            onClick={() => setSelectedSkill(skill)}
            className="p-5 rounded-2xl border border-border bg-card shadow-2xs hover:border-brand/50 cursor-pointer space-y-4 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {skill.category}
              </span>
              {skill.isCore && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand/10 text-brand font-semibold">
                  Core Skill
                </span>
              )}
            </div>

            <div>
              <h4 className="font-bold text-sm text-foreground">{skill.name}</h4>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-muted-foreground">Proficiency</span>
                <span className="font-mono font-bold text-foreground">{skill.proficiency}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-1">
                <div 
                  className="h-full bg-brand rounded-full transition-all duration-500"
                  style={{ width: `${skill.proficiency}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/80 text-[11px] font-mono text-muted-foreground">
              <span>{skill.evidenceCount} Vault Proofs</span>
              <span className="text-brand font-semibold flex items-center gap-0.5">
                <span>Inspect</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand font-semibold">
                  {selectedSkill.category || 'Core'} Skill
                </span>
                <h3 className="text-lg font-bold text-foreground">{selectedSkill.name}</h3>
              </div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="text-muted-foreground hover:text-foreground text-xs p-1 rounded hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                <div className="text-muted-foreground">Demonstrated Score</div>
                <div className="font-semibold text-foreground">{selectedSkill.proficiency}% Proficiency</div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                <div className="text-muted-foreground">Demonstrated Evidence Records</div>
                <div className="font-semibold text-foreground">{selectedSkill.evidenceCount || 0} verified submissions in Vault</div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
              <Link
                href="/skill-studio"
                className="flex-1 py-2 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold text-center transition-colors"
              >
                Learn in Skill Studio
              </Link>
              <Link
                href="/arena"
                className="flex-1 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold text-center shadow-xs transition-colors"
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
