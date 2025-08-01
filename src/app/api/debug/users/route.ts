import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET() {
  try {
    const dbUsers = await db.select().from(users);
    return NextResponse.json({
      message: 'Raw user data from database',
      users: dbUsers
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 