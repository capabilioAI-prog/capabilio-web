export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { assembleLivingPortfolio } from '@/lib/portfolio/portfolio-engine';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const data = await assembleLivingPortfolio(user.id, false);
    return ok(data.completeness);
  } catch (error: any) {
    console.error('Portfolio Completeness GET error:', error);
    return serverError(error.message);
  }
}
