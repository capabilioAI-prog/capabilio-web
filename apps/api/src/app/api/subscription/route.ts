export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { getUserSubscriptionState } from '@/lib/entitlements';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const subscriptionState = await getUserSubscriptionState(user.id);
    return ok(subscriptionState);
  } catch (error) {
    console.error('Get subscription error:', error);
    return serverError();
  }
}
