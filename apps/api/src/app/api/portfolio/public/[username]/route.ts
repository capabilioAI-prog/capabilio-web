export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok, badRequest, notFound, forbidden, serverError } from '@/lib/auth';
import { assembleLivingPortfolio } from '@/lib/portfolio/portfolio-engine';
import { db, profiles } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username;
    if (!username) return badRequest('Username slug is required');

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.username, username.toLowerCase()),
    });

    if (!profile) {
      return notFound('Public Portfolio');
    }

    if (profile.profileVisibility === 'private') {
      return forbidden('This portfolio is set to private by the candidate.');
    }

    const portfolioData = await assembleLivingPortfolio(profile.userId, true);
    return ok(portfolioData);
  } catch (error: any) {
    console.error('Public Portfolio GET error:', error);
    return serverError(error.message);
  }
}
