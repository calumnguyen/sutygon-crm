import { NextRequest, NextResponse } from 'next/server';
import { resolveWarning, unresolveWarning } from '@/lib/utils/warningService';
import { validateApiSession } from '@/lib/utils/authMiddleware';

export async function POST(request: NextRequest) {
  try {
    const requestId = `resolve-warning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const authResult = await validateApiSession(request, requestId);

    if (!authResult.success) {
      return authResult.response!;
    }

    const user = authResult.user;

    const { orderItemId, resolved } = await request.json();

    if (!orderItemId || resolved === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the warning for this order item
    const { db } = await import('@/lib/db');
    const { orderWarnings } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const warnings = await db
      .select()
      .from(orderWarnings)
      .where(eq(orderWarnings.orderItemId, orderItemId))
      .limit(1);

    if (warnings.length === 0) {
      return NextResponse.json({ error: 'No warning found for this order item' }, { status: 404 });
    }

    const warningId = warnings[0].id;

    if (resolved) {
      await resolveWarning(warningId, user!.id);
    } else {
      await unresolveWarning(warningId);
    }

    return NextResponse.json({
      success: true,
      message: resolved ? 'Warning resolved successfully' : 'Warning marked as unresolved',
    });
  } catch (error) {
    console.error('Error resolving warning:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
