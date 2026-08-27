'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  hasCompletedCareerOnboarding?: boolean;
}

export interface UserProfile {
  id?: string;
  userId?: string;
  displayName: string;
  headline?: string | null;
  avatarUrl?: string | null;
  collegeName?: string | null;
  stream?: string | null;
  department?: string | null;
  universityName?: string | null;
  graduationYear?: string | null;
  careerElo?: number;
  hasCompletedCareerOnboarding?: boolean;
}

export interface CareerGoal {
  id?: string;
  targetRoleId?: string;
  targetRoleName: string;
  targetRoleSlug?: string;
  timeline?: string;
  currentLevel?: string;
  careerElo?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  careerGoal: CareerGoal | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  careerGoal: null,
  loading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [careerGoal, setCareerGoal] = useState<CareerGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await api.get<{
        user: { id: string; email: string };
        profile?: UserProfile;
        careerGoal?: CareerGoal;
      }>('/api/profile');

      if (res.success && res.data?.user) {
        setUser({
          id: res.data.user.id,
          email: res.data.user.email,
          displayName: res.data.profile?.displayName,
          hasCompletedCareerOnboarding: res.data.profile?.hasCompletedCareerOnboarding,
        });
        setProfile(res.data.profile || null);
        setCareerGoal(res.data.careerGoal || null);
      } else {
        setUser(null);
        setProfile(null);
        setCareerGoal(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setCareerGoal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession, pathname]);

  const signOut = async () => {
    try {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // ignore
      }

      await api.post('/api/auth/logout', {});
    } catch (e) {
      console.error('Sign out notice:', e);
    } finally {
      // Clear cookie on client side
      document.cookie = 'capabilio-user-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';

      setUser(null);
      setProfile(null);
      setCareerGoal(null);
      
      // Hard redirect to login page to wipe in-memory state and ensure browser back cache is cleared
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        careerGoal,
        loading,
        isAuthenticated: !!user,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
