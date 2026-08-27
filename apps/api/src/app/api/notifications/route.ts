export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { db, notifications } from '@capabilio/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    let notifs = await db.query.notifications.findMany({
      where: eq(notifications.userId, user.id as any),
      orderBy: [desc(notifications.createdAt)],
      limit: 20,
    });

    if (notifs.length === 0) {
      // Seed initial welcoming notifications
      await db.insert(notifications).values([
        {
          userId: user.id as any,
          type: 'assessment_complete',
          title: 'Career Calibration Initialized',
          message: 'Your baseline profile and Skill Graph are active.',
          link: '/aura',
          isRead: false,
        },
        {
          userId: user.id as any,
          type: 'mission_evaluated',
          title: 'Arena Workstations Ready',
          message: 'Launch your first sprint simulation to earn verified evidence.',
          link: '/arena',
          isRead: false,
        }
      ]);

      notifs = await db.query.notifications.findMany({
        where: eq(notifications.userId, user.id as any),
        orderBy: [desc(notifications.createdAt)],
      });
    }

    const unreadCount = notifs.filter(n => !n.isRead).length;

    return ok({ notifications: notifs, unreadCount });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return serverError(error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    // Mark all as read
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, user.id as any));

    return ok({ markedAllRead: true });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return serverError(error.message);
  }
}
