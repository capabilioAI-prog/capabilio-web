export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, subscriptions, auditLogs } from '@capabilio/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getUserSubscriptionState } from '@/lib/entitlements';
import { StudentPlanTier, BillingCycle } from '@capabilio/types';

const UpgradeSchema = z.object({
  plan: z.enum(['free', 'pro', 'elite']),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = UpgradeSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Invalid plan selection: choose free, pro, or elite');
    }

    const { plan, billingCycle } = parsed.data;

    // Calculate billing period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Check if subscription exists
    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, user.id),
    });

    if (existing) {
      await db.update(subscriptions)
        .set({
          plan: plan as any,
          billingCycle,
          status: 'active',
          periodStart: now,
          periodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, existing.id));
    } else {
      await db.insert(subscriptions).values({
        userId: user.id,
        plan: plan as any,
        billingCycle,
        status: 'active',
        periodStart: now,
        periodEnd,
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'subscription_upgraded',
      resourceType: 'subscription',
      metadata: { plan, billingCycle, timestamp: now.toISOString() },
    });

    const updatedState = await getUserSubscriptionState(user.id);
    return ok({
      message: `Successfully upgraded to ${plan.toUpperCase()} plan`,
      subscription: updatedState,
    });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    return serverError();
  }
}
