'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  UserSubscriptionState, 
  StudentPlanTier, 
  BillingCycle, 
  PlanEntitlement, 
  FeatureUsageTelemetry,
  PLAN_ENTITLEMENTS 
} from '@capabilio/types';
import { useAuth } from '@/lib/auth-context';

interface EntitlementsContextValue {
  subscription: UserSubscriptionState | null;
  plan: StudentPlanTier;
  entitlements: PlanEntitlement;
  usage: FeatureUsageTelemetry;
  loading: boolean;
  upgradeModalOpen: boolean;
  activeFeatureModal: string | null;
  openUpgradeModal: (featureId?: string) => void;
  closeUpgradeModal: () => void;
  upgradePlan: (plan: StudentPlanTier, billingCycle?: BillingCycle) => Promise<{ success: boolean; message?: string }>;
  purchaseAddon: (addonType: string) => Promise<{ success: boolean; message?: string }>;
  refreshSubscription: () => Promise<void>;
}

const DEFAULT_USAGE: FeatureUsageTelemetry = {
  arenaTasksToday: 0,
  arenaLimit: 1,
  aiInterviewsThisMonth: 0,
  aiInterviewsLimit: 0,
  skillReportsThisMonth: 0,
  skillReportsLimit: 0,
  marketReportsThisMonth: 0,
  marketReportsLimit: 0,
  resetIst: 'Tomorrow at 12:00 AM IST',
};

const EntitlementsContext = createContext<EntitlementsContextValue>({
  subscription: null,
  plan: 'free',
  entitlements: PLAN_ENTITLEMENTS.free,
  usage: DEFAULT_USAGE,
  loading: true,
  upgradeModalOpen: false,
  activeFeatureModal: null,
  openUpgradeModal: () => {},
  closeUpgradeModal: () => {},
  upgradePlan: async () => ({ success: false }),
  purchaseAddon: async () => ({ success: false }),
  refreshSubscription: async () => {},
});

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [subscription, setSubscription] = useState<UserSubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [activeFeatureModal, setActiveFeatureModal] = useState<string | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<UserSubscriptionState>('/api/subscription');
      if (res.success && res.data) {
        setSubscription(res.data);
      } else {
        setSubscription({
          plan: 'free',
          billingCycle: 'monthly',
          status: 'active',
          entitlements: PLAN_ENTITLEMENTS.free,
          usage: DEFAULT_USAGE,
        });
      }
    } catch {
      setSubscription({
        plan: 'free',
        billingCycle: 'monthly',
        status: 'active',
        entitlements: PLAN_ENTITLEMENTS.free,
        usage: DEFAULT_USAGE,
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription, pathname]);

  const openUpgradeModal = useCallback((featureId?: string) => {
    setActiveFeatureModal(featureId || null);
    setUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(false);
    setActiveFeatureModal(null);
  }, []);

  const upgradePlan = async (targetPlan: StudentPlanTier, billingCycle: BillingCycle = 'monthly') => {
    try {
      const res = await api.post<{ message: string; subscription: UserSubscriptionState }>('/api/subscription/upgrade', {
        plan: targetPlan,
        billingCycle,
      });

      if (res.success && res.data?.subscription) {
        setSubscription(res.data.subscription);
        return { success: true, message: res.data.message };
      }
      return { success: false, message: (res as any).error?.message || 'Upgrade failed' };
    } catch {
      return { success: false, message: 'Network error during upgrade' };
    }
  };

  const purchaseAddon = async (addonType: string) => {
    try {
      const res = await api.post<{ message: string }>('/api/subscription/addon', {
        addonType,
      });
      if (res.success) {
        await refreshSubscription();
        return { success: true, message: res.data.message };
      }
      return { success: false, message: (res as any).error?.message || 'Add-on purchase failed' };
    } catch {
      return { success: false, message: 'Network error during add-on purchase' };
    }
  };

  const plan = subscription?.plan ?? 'free';
  const entitlements = subscription?.entitlements ?? PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.free;
  const usage = subscription?.usage ?? DEFAULT_USAGE;

  return (
    <EntitlementsContext.Provider
      value={{
        subscription,
        plan,
        entitlements,
        usage,
        loading,
        upgradeModalOpen,
        activeFeatureModal,
        openUpgradeModal,
        closeUpgradeModal,
        upgradePlan,
        purchaseAddon,
        refreshSubscription,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  return useContext(EntitlementsContext);
}
