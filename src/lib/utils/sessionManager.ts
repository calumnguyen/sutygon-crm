import { db } from '@/lib/db';
import { userSessions, users } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { decryptUserData } from '@/lib/utils/userEncryption';
import {
  logDatabaseError,
  logConnectionError,
  logAuthenticationError,
} from '@/lib/utils/errorMonitor';
import crypto from 'crypto';

// Session duration: 8 hours
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

export interface SessionData {
  sessionToken: string;
  userId: number;
  expiresAt: Date;
  user: {
    id: number;
    name: string;
    employeeKey?: string; // Optional since we don't return it from validation
    role: string;
    status: string;
  };
}

// Generate a cryptographically secure session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create a new session for a user
export async function createSession(
  userId: number,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  try {
    await db.insert(userSessions).values({
      sessionToken,
      userId,
      expiresAt,
      isActive: true,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    });

    return sessionToken;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw new Error('Failed to create session');
  }
}

// Validate a session token and return user data
export async function validateSession(sessionToken: string): Promise<SessionData | null> {
  const requestId = `session-mgr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  const maxRetries = 2;
  let retryCount = 0;

  console.log(`[${requestId}] 🔍 Session manager validation started`);

  while (retryCount <= maxRetries) {
    try {
      console.log(
        `[${requestId}] 🔍 Attempt ${retryCount + 1}/${maxRetries + 1}: Looking up session...`
      );

      const session = await db.query.userSessions.findFirst({
        where: and(
          eq(userSessions.sessionToken, sessionToken),
          eq(userSessions.isActive, true),
          gt(userSessions.expiresAt, new Date())
        ),
      });

      if (!session) {
        console.warn(`[${requestId}] ⚠️ Session not found or inactive/expired`);
        return null;
      }

      console.log(`[${requestId}] ✅ Session found:`, {
        sessionId: session.sessionToken.substring(0, 8) + '...',
        userId: session.userId,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
      });

      // Get user data separately
      console.log(`[${requestId}] 🔍 Looking up user data...`);
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
      });

      if (!user) {
        console.error(`[${requestId}] ❌ User not found for session:`, session.userId);
        return null;
      }

      console.log(`[${requestId}] ✅ User found:`, {
        userId: user.id,
        hasName: !!user.name,
        hasRole: !!user.role,
        hasStatus: !!user.status,
      });

      // Update session activity timestamp
      console.log(`[${requestId}] 🔄 Updating session activity...`);
      await db
        .update(userSessions)
        .set({ updatedAt: new Date() })
        .where(eq(userSessions.sessionToken, sessionToken));

      // Decrypt user data
      console.log(`[${requestId}] 🔓 Decrypting user data...`);
      const decryptedUser = decryptUserData(user);

      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ✅ Session validation completed successfully in ${duration}ms`, {
        userId: user.id,
        userName: decryptedUser.name,
        userRole: decryptedUser.role,
        duration,
        timestamp: new Date().toISOString(),
      });

      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expiresAt: session.expiresAt,
        user: {
          id: user.id,
          name: decryptedUser.name,
          // Don't return employeeKey from session validation (it's hashed in DB)
          role: decryptedUser.role,
          status: decryptedUser.status,
        },
      };
    } catch (error) {
      retryCount++;
      const duration = Date.now() - startTime;
      console.error(
        `[${requestId}] ❌ Session validation failed (attempt ${retryCount}/${maxRetries + 1}) after ${duration}ms:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          retryCount,
          maxRetries,
          duration,
          timestamp: new Date().toISOString(),
        }
      );

      // Check if it's a connection error
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes('connection') ||
          error.message.includes('timeout') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('fetch failed') ||
          error.message.includes('other side closed'));

      // Log to error monitor
      if (isConnectionError) {
        await logConnectionError(
          requestId,
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'session_validation_database',
            endpoint: 'sessionManager',
          }
        );
      } else {
        await logDatabaseError(
          requestId,
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: 'session_validation_database',
            endpoint: 'sessionManager',
          }
        );
      }

      // If it's a database connection error and we haven't exhausted retries, wait and retry
      if (retryCount <= maxRetries && isConnectionError) {
        const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s
        console.log(`[${requestId}] 🔄 Database connection issue - retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // If we've exhausted retries or it's not a connection error, return null
      console.error(`[${requestId}] ❌ Session validation failed after all retries`);
      return null;
    }
  }

  return null;
}

// Invalidate a specific session
export async function invalidateSession(sessionToken: string): Promise<boolean> {
  try {
    const result = await db
      .update(userSessions)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(userSessions.sessionToken, sessionToken));

    return true;
  } catch (error) {
    console.error('Failed to invalidate session:', error);
    return false;
  }
}

// Invalidate all sessions for a specific user
export async function invalidateUserSessions(userId: number): Promise<boolean> {
  try {
    await db
      .update(userSessions)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(userSessions.userId, userId), eq(userSessions.isActive, true)));

    return true;
  } catch (error) {
    console.error('Failed to invalidate user sessions:', error);
    return false;
  }
}

// Invalidate all sessions for non-admin users (for store closure)
export async function invalidateNonAdminSessions(): Promise<boolean> {
  try {
    // Get all non-admin user IDs with full user data for decryption
    const allUsers = await db.query.users.findMany();

    const nonAdminUserIds = allUsers
      .filter((user) => {
        const decryptedUser = decryptUserData(user);
        return decryptedUser.role.toLowerCase() !== 'admin';
      })
      .map((user) => user.id);

    if (nonAdminUserIds.length === 0) {
      return true; // No non-admin users to logout
    }

    // Invalidate sessions for all non-admin users
    for (const userId of nonAdminUserIds) {
      await invalidateUserSessions(userId);
    }

    console.log(`Invalidated sessions for ${nonAdminUserIds.length} non-admin users`);
    return true;
  } catch (error) {
    console.error('Failed to invalidate non-admin sessions:', error);
    return false;
  }
}

// Clean up expired sessions (run periodically)
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await db
      .update(userSessions)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(userSessions.isActive, true), gt(userSessions.expiresAt, new Date())));

    return 0; // Drizzle doesn't return affected rows count easily
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error);
    return 0;
  }
}

// Extend session expiration (refresh session)
export async function extendSession(sessionToken: string): Promise<boolean> {
  try {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION);

    await db
      .update(userSessions)
      .set({
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(and(eq(userSessions.sessionToken, sessionToken), eq(userSessions.isActive, true)));

    return true;
  } catch (error) {
    console.error('Failed to extend session:', error);
    return false;
  }
}
