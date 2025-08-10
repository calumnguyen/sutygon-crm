import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/utils/sessionManager';

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, testType } = await req.json();

    if (!sessionToken) {
      return NextResponse.json({ error: 'Session token is required' }, { status: 400 });
    }

    if (testType === 'retry') {
      // Simulate a retry scenario
      const results = [];
      for (let i = 0; i < 3; i++) {
        try {
          const sessionData = await validateSession(sessionToken);
          results.push({
            attempt: i + 1,
            success: !!sessionData,
            timestamp: new Date().toISOString(),
          });

          if (sessionData) {
            break; // Success, no need to retry
          }

          // Wait before retry
          if (i < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          results.push({
            attempt: i + 1,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      }

      return NextResponse.json({
        message: 'Session validation retry test',
        results,
        finalResult: results[results.length - 1],
      });
    }

    // Normal validation
    const sessionData = await validateSession(sessionToken);

    if (!sessionData) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: sessionData.user,
      expiresAt: sessionData.expiresAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Session test error:', error);
    return NextResponse.json(
      {
        error: 'Session test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
