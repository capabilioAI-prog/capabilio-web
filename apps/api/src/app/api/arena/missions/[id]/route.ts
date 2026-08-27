export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, notFound } from '@/lib/auth';
import { generateAdaptiveMission } from '@/lib/arena/mission-generator';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorized();

  const id = params.id;
  const isDba = id.startsWith('dba_') || id.includes('dba') || id.includes('database');

  const mission = await generateAdaptiveMission({
    userId: user.id,
    roleSlug: isDba ? 'database-administrator' : 'data-analyst',
    currentElo: 400,
    history: [],
  });

  mission.id = id;

  return ok({ mission });
}
