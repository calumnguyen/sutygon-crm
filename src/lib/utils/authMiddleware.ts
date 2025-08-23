import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from './sessionManager';
import { logAuthenticationError } from './errorMonitor';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: number;
    name: string;
    role: string;
    employeeKey?: string;
  };
}

export async function validateApiSession(
  request: NextRequest,
  requestId: string
): Promise<{
  success: boolean;
  user?: { id: number; name: string; role: string; employeeKey?: string };
  response?: NextResponse;
}> {
  try {
    // Get session token from Authorization header or request body
    let sessionToken: string | null = null;

    // Try Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    }

    // If no Authorization header, try to get from request body (for POST requests)
    if (!sessionToken && request.method === 'POST') {
      try {
        // Clone the request to avoid consuming the body
        const clonedRequest = request.clone();
        const body = await clonedRequest.json();
        sessionToken = body.sessionToken || null;
      } catch {
        // If we can't parse JSON, that's okay - we'll check for session token in other ways
      }
    }

    // If still no session token, try to get from URL search params
    if (!sessionToken) {
      const url = new URL(request.url);
      sessionToken = url.searchParams.get('sessionToken');
    }

    // For GET requests, also check for session token in headers (common pattern)
    if (!sessionToken && request.method === 'GET') {
      sessionToken = request.headers.get('x-session-token') || request.headers.get('session-token');
    }

    if (!sessionToken) {
      console.warn(`[${requestId}] ⚠️ No session token provided in request`);
      await logAuthenticationError(requestId, new Error('No session token provided'), {
        operation: 'Session validation',
        endpoint: request.url,
      });
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Authentication required',
            reason: 'authentication_error',
            details: 'No session token provided in request',
          },
          { status: 401 }
        ),
      };
    }

    console.log(`[${requestId}] 🔐 Validating session token...`);
    const sessionData = await validateSession(sessionToken);

    if (!sessionData) {
      console.warn(`[${requestId}] ⚠️ Invalid or expired session token`);
      await logAuthenticationError(requestId, new Error('Invalid or expired session'), {
        operation: 'Session validation',
        endpoint: request.url,
        requestData: { sessionToken: sessionToken.substring(0, 8) + '...' },
      });
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Invalid or expired session',
            reason: 'session_expired',
            details: 'Session token is invalid or has expired',
          },
          { status: 401 }
        ),
      };
    }

    console.log(`[${requestId}] ✅ Session validated successfully for user:`, {
      userId: sessionData.user.id,
      userName: sessionData.user.name,
      userRole: sessionData.user.role,
    });

    return {
      success: true,
      user: sessionData.user as { id: number; name: string; role: string; employeeKey?: string },
    };
  } catch (error) {
    console.error(`[${requestId}] ❌ Session validation error:`, error);
    await logAuthenticationError(
      requestId,
      error instanceof Error ? error : (new Error(String(error)) as Error),
      {
        operation: 'Session validation',
        endpoint: request.url,
      }
    );
    return {
      success: false,
      response: NextResponse.json({ error: 'Authentication failed' }, { status: 500 }),
    };
  }
}

export function withAuth<T extends unknown[]>(
  handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T) => {
    const requestId = `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const authResult = await validateApiSession(request, requestId);

    if (!authResult.success) {
      return authResult.response!;
    }

    // Create authenticated request with user data
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = authResult.user;

    return handler(authenticatedRequest, ...args);
  };
}
