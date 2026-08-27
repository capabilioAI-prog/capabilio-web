export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, pulsePosts, profiles } from '@capabilio/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const CreatePostSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(3, 'Post must contain at least 3 characters').max(5000),
  category: z.enum(['sparks', 'architecture', 'incident', 'career_win', 'technical_news', 'evidence_share', 'question', 'insight']).default('insight'),
  tags: z.array(z.string()).default([]),
  domain: z.string().default('software_engineering'),
  signalType: z.enum(['career_signal', 'tech_signal', 'trend_signal', 'network_signal']).optional(),
  signalNote: z.string().optional(),
  codeSnippet: z.object({
    language: z.string(),
    code: z.string(),
    filename: z.string().optional(),
  }).optional(),
  evidenceData: z.object({
    missionId: z.string().optional(),
    missionTitle: z.string(),
    roleName: z.string(),
    eloDelta: z.number(),
    score: z.number(),
    skillName: z.string(),
    proofHash: z.string().optional(),
  }).optional(),
  actionPrompt: z.object({
    type: z.enum(['arena', 'skill_studio', 'launchpad']),
    label: z.string(),
    linkUrl: z.string(),
    badgeText: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Invalid post data', parsed.error.flatten());
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id as any),
    });

    const authorName = profile?.displayName || user.email?.split('@')[0] || 'Professional';
    const authorHeadline = profile?.headline || 'Capabilio Professional';
    const authorRole = 'Software Engineer';

    const [post] = await db.insert(pulsePosts).values({
      userId: (user.id as any)!,
      authorName,
      authorHeadline,
      authorRole,
      category: parsed.data.category as any,
      title: parsed.data.title ?? null,
      content: parsed.data.content,
      tags: parsed.data.tags,
      domain: parsed.data.domain,
      signalType: (parsed.data.signalType as any) ?? null,
      signalNote: parsed.data.signalNote ?? null,
      codeSnippet: parsed.data.codeSnippet ?? null,
      evidenceData: parsed.data.evidenceData ?? null,
      actionPrompt: parsed.data.actionPrompt ?? null,
    }).returning();

    return ok({ post }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Create post error:', error);
    return serverError(error.message);
  }
}
