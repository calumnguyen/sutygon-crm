import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/utils/sessionManager';

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token is required' }, { status: 400 });
    }

    const success = await invalidateSession(sessionToken);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });
    } else {
      return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
    }
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No session token provided' }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const success = await invalidateSession(sessionToken);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Logged out successfully',
      });
    } else {
      return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
    }
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
