export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { getLaunchpadWorkspace } from '@/lib/launchpad/launchpad-engine';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const workspace = await getLaunchpadWorkspace(user.id);
    return ok(workspace);
  } catch (error: any) {
    console.error('Launchpad GET error:', error);
    return serverError(error.message);
  }
}
