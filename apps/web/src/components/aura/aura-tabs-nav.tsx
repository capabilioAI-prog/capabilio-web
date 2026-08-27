'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  FolderLock, 
  Compass, 
  Mic2, 
  Target, 
  Activity, 
  Dna, 
  Award,
  Sparkles
} from 'lucide-react';

interface AuraTabsNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const AURA_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'vault', label: 'Career & Vault', icon: FolderLock },
  { id: 'skills', label: 'Skills', icon: Compass },
  { id: 'interview', label: 'AI Interview', icon: Mic2 },
  { id: 'skill-gaps', label: 'Skill Gaps', icon: Target },
  { id: 'resilience', label: 'Resilience', icon: Activity },
  { id: 'code-dna', label: 'Code DNA', icon: Dna },
  { id: 'voucher', label: 'Voucher', icon: Award },
];

export function AuraTabsNav({ activeTab, onSelectTab }: AuraTabsNavProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-2.5 no-scrollbar">
          {AURA_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={
                  isActive
                    ? 'px-3.5 py-2 rounded-xl bg-brand text-white font-semibold text-xs whitespace-nowrap shadow-xs flex items-center gap-2 transition-all'
                    : 'px-3.5 py-2 rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground font-medium text-xs whitespace-nowrap transition-all flex items-center gap-2'
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
