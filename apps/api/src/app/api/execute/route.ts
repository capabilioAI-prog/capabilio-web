export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError, badRequest } from '@/lib/auth';
import { executeCode } from '@capabilio/evaluation';
import { z } from 'zod';

const ExecuteSchema = z.object({
  language: z.enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'rust']),
  files: z.array(z.object({
    name: z.string(),
    content: z.string().max(50000), // 50KB limit per file
  })).max(20),
  stdin: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = ExecuteSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid execution request', parsed.error.flatten());

    const result = await executeCode(parsed.data.files, parsed.data.language, parsed.data.stdin);
    return ok({ result });
  } catch (error) {
    console.error('Execute error:', error);
    if (error instanceof Error && error.message.includes('Unsupported language')) {
      return badRequest(error.message);
    }
    return serverError();
  }
}
