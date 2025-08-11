import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/utils/sessionManager';
import { logAuthenticationError, logConnectionError } from '@/lib/utils/errorMonitor';
import { createLogger } from '@/lib/utils/vercelLogger';

export async function POST(req: NextRequest) {
  const requestId = `session-validate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const logger = createLogger(requestId);
  const startTime = Date.now();

  logger.auth('Session validation started');

  try {
    const { sessionToken } = await req.json();

    logger.info('Request data received', {
      hasSessionToken: !!sessionToken,
      tokenLength: sessionToken?.length || 0,
    });

    if (!sessionToken) {
      logger.warn('No session token provided');
      return NextResponse.json({ error: 'Session token is required' }, { status: 400 });
    }

    logger.auth('Validating session token');
    const sessionData = await validateSession(sessionToken);

    if (!sessionData) {
      logger.warn('Invalid or expired session');
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    logger.success('Session validation successful', {
      userId: sessionData.user.id,
      userName: sessionData.user.name,
      userRole: sessionData.user.role,
      expiresAt: sessionData.expiresAt,
    });

    const duration = Date.now() - startTime;
    logger.performance('Session validation completed', duration, {
      userId: sessionData.user.id,
    });

    return NextResponse.json({
      success: true,
      user: sessionData.user,
      expiresAt: sessionData.expiresAt,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      'Session validation failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        duration,
      }
    );

    // Log to error monitor
    const isConnectionError =
      error instanceof Error &&
      (error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('fetch failed') ||
        error.message.includes('other side closed') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND'));

    if (isConnectionError) {
      await logConnectionError(
        requestId,
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'session_validation',
          endpoint: '/api/auth/validate-session',
        }
      );
    } else {
      await logAuthenticationError(
        requestId,
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'session_validation',
          endpoint: '/api/auth/validate-session',
        }
      );
    }

    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const requestId = `session-validate-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const logger = createLogger(requestId);
  const startTime = Date.now();

  logger.auth('Session validation (GET) started');

  try {
    const authHeader = req.headers.get('authorization');

    logger.info('Request data received', {
      hasAuthHeader: !!authHeader,
      authHeaderType: authHeader?.startsWith('Bearer ') ? 'Bearer' : 'Other',
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('No valid authorization header provided');
      return NextResponse.json({ error: 'No session token provided' }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    logger.auth('Validating session token from header');
    const sessionData = await validateSession(sessionToken);

    if (!sessionData) {
      logger.warn('Invalid or expired session from header');
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    logger.success('Session validation (GET) successful', {
      userId: sessionData.user.id,
      userName: sessionData.user.name,
      userRole: sessionData.user.role,
      expiresAt: sessionData.expiresAt,
    });

    const duration = Date.now() - startTime;
    logger.performance('Session validation (GET) completed', duration, {
      userId: sessionData.user.id,
    });

    return NextResponse.json({
      success: true,
      user: sessionData.user,
      expiresAt: sessionData.expiresAt,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      'Session validation (GET) failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        duration,
      }
    );

    // Log to error monitor
    const isConnectionError =
      error instanceof Error &&
      (error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('fetch failed') ||
        error.message.includes('other side closed') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ENOTFOUND'));

    if (isConnectionError) {
      await logConnectionError(
        requestId,
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'session_validation_get',
          endpoint: '/api/auth/validate-session',
        }
      );
    } else {
      await logAuthenticationError(
        requestId,
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: 'session_validation_get',
          endpoint: '/api/auth/validate-session',
        }
      );
    }

    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 });
  }
}
