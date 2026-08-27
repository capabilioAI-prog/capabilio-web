export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { getLaunchpadWorkspace } from '@/lib/launchpad/launchpad-engine';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    const workMode = searchParams.get('workMode');
    const type = searchParams.get('type');
    const minMatch = searchParams.get('minMatch') ? parseInt(searchParams.get('minMatch')!) : 0;

    const workspace = await getLaunchpadWorkspace(user.id);
    let filtered = workspace.allOpportunities;

    if (q) {
      filtered = filtered.filter(o => 
        o.title.toLowerCase().includes(q) ||
        o.company.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q) ||
        o.requiredSkills.some(s => s.name.toLowerCase().includes(q))
      );
    }

    if (workMode && workMode !== 'all') {
      filtered = filtered.filter(o => o.workMode === workMode);
    }

    if (type && type !== 'all') {
      filtered = filtered.filter(o => o.employmentType === type);
    }

    if (minMatch > 0) {
      filtered = filtered.filter(o => o.matchScore >= minMatch);
    }

    return ok({
      total: filtered.length,
      opportunities: filtered,
    });
  } catch (error: any) {
    console.error('Opportunities GET error:', error);
    return serverError(error.message);
  }
}
