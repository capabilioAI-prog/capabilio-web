'use client';

import React, { useState } from 'react';

interface SkillItem {
  name: string;
  slug: string;
  proficiency: number; // 0-100
}

interface SkillRadarChartProps {
  skills: SkillItem[];
  onSelectSkill?: (skill: SkillItem) => void;
  selectedSkill?: SkillItem | null;
}

export function SkillRadarChart({ skills, onSelectSkill, selectedSkill }: SkillRadarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const size = 380;
  const center = size / 2;
  const radius = 120;
  const total = skills.length;

  if (total === 0) {
    return <div className="text-xs font-mono text-muted-foreground p-8 text-center">No skill telemetry recorded</div>;
  }

  const angleSlice = (Math.PI * 2) / total;

  // Compute vertices for polygon
  const points = skills.map((s, i) => {
    const angle = i * angleSlice - Math.PI / 2;
    const r = (s.proficiency / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle, ...s };
  });

  const polygonPointsString = points.map(p => `${p.x},${p.y}`).join(' ');

  // Concentric levels
  const levels = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="flex flex-col items-center justify-center relative select-none w-full max-w-[420px] mx-auto">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto max-h-[380px] overflow-visible"
      >
        {/* Background Grid Rings */}
        {levels.map((lvl, lIdx) => (
          <polygon
            key={lIdx}
            points={skills.map((_, i) => {
              const angle = i * angleSlice - Math.PI / 2;
              const r = lvl * radius;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
            strokeDasharray={lvl < 1.0 ? '2 2' : 'none'}
          />
        ))}

        {/* Axis Lines */}
        {skills.map((_, i) => {
          const angle = i * angleSlice - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          );
        })}

        {/* Radar Filled Area */}
        <polygon
          points={polygonPointsString}
          className="fill-brand/20 stroke-brand stroke-2 transition-all duration-300"
        />

        {/* Data Point Nodes */}
        {points.map((p, i) => {
          const isSelected = selectedSkill?.slug === p.slug;
          const isHovered = hoveredIdx === i;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isSelected || isHovered ? 6 : 4}
              className={`${isSelected || isHovered ? 'fill-brand stroke-white stroke-2' : 'fill-brand'} transition-all cursor-pointer`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectSkill && onSelectSkill(p)}
            />
          );
        })}

        {/* Perimeter Skill Labels */}
        {skills.map((s, i) => {
          const angle = i * angleSlice - Math.PI / 2;
          const labelRadius = radius + 32;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);

          const isSelected = selectedSkill?.slug === s.slug;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={i}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectSkill && onSelectSkill(s)}
            >
              <text
                x={x}
                y={y - 6}
                textAnchor="middle"
                className={`text-[11px] font-sans font-bold transition-colors ${
                  isSelected || isHovered ? 'fill-brand' : 'fill-foreground'
                }`}
              >
                {s.name}
              </text>
              <text
                x={x}
                y={y + 8}
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-brand"
              >
                {s.proficiency}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
