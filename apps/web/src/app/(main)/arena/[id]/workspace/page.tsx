"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DataAnalystWorkstation } from '@/components/arena/data-analyst-workstation';
import { DbaWorkstation } from '@/components/arena/dba-workstation';

export default function ArenaWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const [mission, setMission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const missionId = (params?.id as string) || 'mission_default';
  const isDba = missionId.startsWith('dba_') || missionId.includes('dba') || missionId.includes('database');

  useEffect(() => {
    fetchMission();
  }, [missionId]);

  async function fetchMission() {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/arena/missions/${missionId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data.mission) {
        setMission(data.data.mission);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-mono text-xs">
        <div className="space-y-2 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto" />
          <p>Initializing {isDba ? 'Database Operations' : 'Analytics'} Workstation...</p>
        </div>
      </div>
    );
  }

  if (isDba) {
    return <DbaWorkstation mission={mission} onExit={() => router.push('/arena')} />;
  }

  return <DataAnalystWorkstation mission={mission} onExit={() => router.push('/arena')} />;
}
