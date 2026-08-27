export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, auraDocuments } from '@capabilio/db';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const CreateDocSchema = z.object({
  category: z.enum(['resume', 'portfolio_artifact', 'project', 'certificate', 'arena_proof', 'interview_report', 'document']).default('document'),
  title: z.string().min(2),
  description: z.string().optional(),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().default(1024),
  mimeType: z.string().default('application/pdf'),
  fileUrl: z.string().optional(),
  verified: z.boolean().default(false),
  verificationHash: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const docs = await db.query.auraDocuments.findMany({
      where: eq(auraDocuments.userId, user.id as any),
      orderBy: [desc(auraDocuments.createdAt)],
    });

    return ok({ documents: docs });
  } catch (error: any) {
    console.error('Get vault docs error:', error);
    return serverError(error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = CreateDocSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid document data', parsed.error.flatten());

    const [doc] = await db.insert(auraDocuments).values({
      userId: user.id as any,
      category: parsed.data.category as any,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      fileName: parsed.data.fileName,
      fileSizeBytes: parsed.data.fileSizeBytes,
      mimeType: parsed.data.mimeType,
      fileUrl: parsed.data.fileUrl ?? null,
      verified: parsed.data.verified,
      verificationHash: parsed.data.verificationHash ?? null,
    }).returning();

    return ok({ document: doc }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Upload document error:', error);
    return serverError(error.message);
  }
}
