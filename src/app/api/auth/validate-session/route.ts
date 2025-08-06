import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/utils/sessionManager';

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token is required' }, { status: 400 });
    }

    const sessionData = await validateSession(sessionToken);

    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: sessionData.user,
      expiresAt: sessionData.expiresAt,
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No session token provided' }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    const sessionData = await validateSession(sessionToken);

    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: sessionData.user,
      expiresAt: sessionData.expiresAt,
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 });
  }
}
