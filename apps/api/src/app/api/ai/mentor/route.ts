export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError, badRequest } from '@/lib/auth';
import { aiService } from '@capabilio/ai';
import { z } from 'zod';

const MentorSchema = z.object({
  missionTitle: z.string(),
  roleName: z.string(),
  question: z.string().max(2000),
  currentCode: z.string().max(10000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = MentorSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid request');

    const wantsStream = request.headers.get('accept')?.includes('text/event-stream');

    if (!wantsStream) {
      try {
        const response = await aiService.generate(
          [
            {
              role: 'system',
              content: 'You are a staff engineer mentoring a student. Be concise and provide actionable hints.',
            },
            {
              role: 'user',
              content: `Mission: ${parsed.data.missionTitle}\nRole: ${parsed.data.roleName}\nQuestion: ${parsed.data.question}`,
            },
          ],
          { userId: user.id, feature: 'mentor', maxTokens: 300 }
        );
        return ok({ content: response.content });
      } catch {
        const fallbackHint = parsed.data.question.toLowerCase().includes('hint')
          ? 'Check src/hooks/useFormValidation.ts! Look closely at: (1) the card regex format for spaces vs hyphens, and (2) how isValid boolean is calculated.'
          : 'Inspect the return value of useFormValidation. Ensure isValid is true when Object.keys(errors).length === 0.';
        return ok({ content: fallbackHint });
      }
    }

    // Stream AI mentor response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = aiService.stream(
            [
              {
                role: 'system',
                content: `You are a senior engineer mentoring a student working on a professional simulation mission. Be concise, helpful, and professional. Never give away the complete solution.`,
              },
              {
                role: 'user',
                content: `Mission: ${parsed.data.missionTitle}\nRole: ${parsed.data.roleName}\n\nStudent's question: ${parsed.data.question}${parsed.data.currentCode ? `\n\nTheir current code:\n${parsed.data.currentCode}` : ''}`,
              },
            ],
            { userId: user.id, feature: 'mentor', maxTokens: 500 }
          );

          for await (const chunk of generator) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
          }
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ delta: 'Check useFormValidation.ts for card format and isValid condition.' })}\n\n`));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Mentor error:', error);
    return serverError();
  }
}
