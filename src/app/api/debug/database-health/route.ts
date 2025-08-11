import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseConnection, monitorDatabaseConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const isHealthy = await checkDatabaseConnection();
    const monitoredHealth = await monitorDatabaseConnection();

    return NextResponse.json({
      success: true,
      database: {
        isHealthy,
        monitoredHealth,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
