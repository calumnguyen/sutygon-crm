import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/utils/sessionManager';

export async function POST(req: NextRequest) {
  try {
    // Optional: Add authentication check for admin users or API key
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CLEANUP_API_KEY}`) {
      // For now, allow unauthenticated cleanup (you might want to secure this)
      console.log('Session cleanup called without proper authorization');
    }

    const cleanedCount = await cleanupExpiredSessions();

    return NextResponse.json({
      success: true,
      message: `Cleaned up expired sessions`,
      cleanedCount,
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
    return NextResponse.json({ error: 'Session cleanup failed' }, { status: 500 });
  }
}

// Allow GET requests for cron jobs
export async function GET(req: NextRequest) {
  return POST(req);
}
