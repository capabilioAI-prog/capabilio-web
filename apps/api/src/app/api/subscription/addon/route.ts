export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, addonPurchases, auditLogs } from '@capabilio/db';
import { z } from 'zod';
import { ADDON_PRICING } from '@capabilio/types';

const AddonSchema = z.object({
  addonType: z.enum([
    'additional_interview',
    'additional_market_report',
    'personal_branding_video',
    'single_portfolio_theme',
    'gold_portfolio_theme'
  ]),
});

const PRICE_MAP: Record<string, number> = {
  additional_interview: 49,
  additional_market_report: 49,
  personal_branding_video: 129,
  single_portfolio_theme: 29,
  gold_portfolio_theme: 49,
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = AddonSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Invalid add-on type');
    }

    const { addonType } = parsed.data;
    const priceInr = PRICE_MAP[addonType] ?? 49;

    const [purchase] = await db.insert(addonPurchases).values({
      userId: user.id,
      addonType,
      priceInr,
      status: 'completed',
    }).returning();

    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'addon_purchased',
      resourceType: 'addon',
      metadata: { addonType, priceInr },
    });

    return ok({
      message: `Purchased ${addonType} successfully`,
      purchase,
    });
  } catch (error) {
    console.error('Purchase addon error:', error);
    return serverError();
  }
}
