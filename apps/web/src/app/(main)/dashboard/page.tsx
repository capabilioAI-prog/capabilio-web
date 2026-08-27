'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuraHeader } from '@/components/aura/aura-header';
import { AuraTabsNav } from '@/components/aura/aura-tabs-nav';
import { AuraDashboardTab } from '@/components/aura/aura-dashboard-tab';
import { AuraVaultTab } from '@/components/aura/aura-vault-tab';
import { AuraSkillsTab } from '@/components/aura/aura-skills-tab';
import { AuraInterviewTab } from '@/components/aura/aura-interview-tab';
import { AuraSkillGapsTab } from '@/components/aura/aura-skill-gaps-tab';
import { AuraResilienceTab } from '@/components/aura/aura-resilience-tab';
import { AuraCodeDnaTab } from '@/components/aura/aura-code-dna-tab';
import { AuraVoucherTab } from '@/components/aura/aura-voucher-tab';
import { AuraEditProfileModal } from '@/components/aura/aura-edit-profile-modal';

export default function AuraPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get('tab') || 'dashboard';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [overviewData, setOverviewData] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/aura/overview', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOverviewData(data.data);
      }
    } catch (e) {
      console.error('Fetch aura overview error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  function handleSelectTab(tabId: string) {
    setActiveTab(tabId);
    router.replace(`/aura?tab=${tabId}`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white flex flex-col pb-20">
      {/* 1. Aura Profile & Career OS Header */}
      <AuraHeader
        overviewData={overviewData}
        onEditProfile={() => setIsEditModalOpen(true)}
        onSelectTab={handleSelectTab}
      />

      {/* 2. Persistent Secondary Tab Navigation */}
      <AuraTabsNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* 3. Tab Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-1 w-full">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto" />
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Calibrating Career Operating System Telemetry...
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <AuraDashboardTab
                overviewData={overviewData}
                onSelectTab={handleSelectTab}
              />
            )}
            {activeTab === 'vault' && <AuraVaultTab />}
            {activeTab === 'skills' && <AuraSkillsTab overviewData={overviewData} />}
            {activeTab === 'interview' && <AuraInterviewTab overviewData={overviewData} />}
            {activeTab === 'skill-gaps' && <AuraSkillGapsTab overviewData={overviewData} />}
            {activeTab === 'resilience' && <AuraResilienceTab overviewData={overviewData} />}
            {activeTab === 'code-dna' && <AuraCodeDnaTab overviewData={overviewData} />}
            {activeTab === 'voucher' && <AuraVoucherTab overviewData={overviewData} />}
          </>
        )}
      </main>

      {/* Profile Edit Modal */}
      {isEditModalOpen && (
        <AuraEditProfileModal
          overviewData={overviewData}
          onClose={() => setIsEditModalOpen(false)}
          onProfileUpdated={fetchOverview}
        />
      )}
    </div>
  );
}
