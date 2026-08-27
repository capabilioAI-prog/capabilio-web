export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { assembleLivingPortfolio } from '@/lib/portfolio/portfolio-engine';
import { db, portfolioSettings } from '@capabilio/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const data = await assembleLivingPortfolio(user.id, false);
    return ok(data);
  } catch (error: any) {
    console.error('Portfolio GET error:', error);
    return serverError(error.message);
  }
}

const UpdatePortfolioSchema = z.object({
  headline: z.string().optional(),
  about: z.string().optional(),
  theme: z.enum(['editorial', 'technical', 'minimal', 'executive']).optional(),
  isPublic: z.boolean().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().nullable().optional(),
  featuredItems: z.array(z.object({
    id: z.string(),
    type: z.string(),
    order: z.number(),
  })).optional(),
  featuredSkillSlugs: z.array(z.string()).optional(),
  enablePersonalBrand: z.boolean().optional(),
  enableVideo: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = UpdatePortfolioSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Invalid portfolio update payload', parsed.error.format());
    }

    const current = await db.query.portfolioSettings.findFirst({
      where: eq(portfolioSettings.userId, user.id as any),
    });

    if (current) {
      await db.update(portfolioSettings)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(portfolioSettings.userId, user.id as any));
    } else {
      await db.insert(portfolioSettings).values({
        userId: user.id as any,
        ...parsed.data,
      });
    }

    const updated = await assembleLivingPortfolio(user.id, false);
    return ok(updated);
  } catch (error: any) {
    console.error('Portfolio PUT error:', error);
    return serverError(error.message);
  }
}
