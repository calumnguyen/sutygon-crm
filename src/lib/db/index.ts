import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Configure Neon connection for high performance
const sql = neon(process.env.DATABASE_URL!, {
  // Connection timeout settings for high-volume operations
  // These settings optimize for 100+ customers and orders daily

  // Array response mode for better performance (disabled for object results)
  arrayMode: false,

  // Enable full response for better error handling (disabled for performance)
  fullResults: false,
});

export const db = drizzle(sql, {
  schema,
  // Enable logging in development
  logger: process.env.NODE_ENV === 'development',
});

// Connection health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Enhanced connection monitoring
let connectionFailureCount = 0;
const MAX_FAILURES = 5;
const FAILURE_RESET_INTERVAL = 60000; // 1 minute

export async function monitorDatabaseConnection(): Promise<boolean> {
  try {
    const isHealthy = await checkDatabaseConnection();

    if (isHealthy) {
      if (connectionFailureCount > 0) {
        console.log(`✅ Database connection recovered after ${connectionFailureCount} failures`);
        connectionFailureCount = 0;
      }
      return true;
    } else {
      connectionFailureCount++;
      console.warn(
        `⚠️ Database connection unhealthy (failure #${connectionFailureCount}/${MAX_FAILURES})`
      );

      if (connectionFailureCount >= MAX_FAILURES) {
        console.error(`🚨 Database connection critically unhealthy after ${MAX_FAILURES} failures`);
        // Could trigger alerts or fallback mechanisms here
      }

      return false;
    }
  } catch (error) {
    connectionFailureCount++;
    console.error(
      `Database connection monitoring failed (failure #${connectionFailureCount}):`,
      error
    );
    return false;
  }
}

// Reset failure count periodically
setInterval(() => {
  if (connectionFailureCount > 0) {
    console.log(`Resetting connection failure count from ${connectionFailureCount} to 0`);
    connectionFailureCount = 0;
  }
}, FAILURE_RESET_INTERVAL);

// Query performance monitoring
export function logQueryPerformance<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }

      // Log all queries in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Query ${queryName} completed in ${duration}ms`);
      }

      resolve(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Query ${queryName} failed after ${duration}ms:`, error);
      reject(error);
    }
  });
}
