export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, portfolioSettings } from '@capabilio/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const FeatureSchema = z.object({
  itemId: z.string().min(1),
  itemType: z.string().default('mission'),
  isFeatured: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = FeatureSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid feature payload', parsed.error.format());

    const { itemId, itemType, isFeatured } = parsed.data;

    const current = await db.query.portfolioSettings.findFirst({
      where: eq(portfolioSettings.userId, user.id as any),
    });

    let currentFeatured = current?.featuredItems || [];

    if (isFeatured) {
      if (!currentFeatured.some(f => f.id === itemId)) {
        currentFeatured.push({ id: itemId, type: itemType, order: currentFeatured.length + 1 });
      }
    } else {
      currentFeatured = currentFeatured.filter(f => f.id !== itemId);
    }

    if (current) {
      await db.update(portfolioSettings)
        .set({ featuredItems: currentFeatured, updatedAt: new Date() })
        .where(eq(portfolioSettings.userId, user.id as any));
    } else {
      await db.insert(portfolioSettings).values({
        userId: user.id as any,
        featuredItems: currentFeatured,
      });
    }

    return ok({ itemId, isFeatured, featuredCount: currentFeatured.length });
  } catch (error: any) {
    console.error('Portfolio Feature POST error:', error);
    return serverError(error.message);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    if (!itemId) return badRequest('Missing itemId query parameter');

    const current = await db.query.portfolioSettings.findFirst({
      where: eq(portfolioSettings.userId, user.id as any),
    });

    let currentFeatured = (current?.featuredItems || []).filter(f => f.id !== itemId);

    if (current) {
      await db.update(portfolioSettings)
        .set({ featuredItems: currentFeatured, updatedAt: new Date() })
        .where(eq(portfolioSettings.userId, user.id as any));
    }

    return ok({ itemId, isFeatured: false, featuredCount: currentFeatured.length });
  } catch (error: any) {
    console.error('Portfolio Feature DELETE error:', error);
    return serverError(error.message);
  }
}
