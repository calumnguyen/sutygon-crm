import { NextResponse } from 'next/server';
import { hashValue } from '@/lib/utils/hash';

export async function GET() {
  try {
    const employeeKey = '123456';
    const hashedKey = hashValue(employeeKey);
    
    return NextResponse.json({
      message: 'Hash test',
      original: employeeKey,
      hashed: hashedKey,
      jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Hash test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 