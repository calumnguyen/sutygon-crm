import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { discountItemizedNames } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  try {
    const itemizedNames = await db
      .select()
      .from(discountItemizedNames)
      .orderBy(discountItemizedNames.name);

    return NextResponse.json({
      success: true,
      itemizedNames,
    });
  } catch (error) {
    console.error('Error fetching discount itemized names:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discount itemized names' },
      { status: 500 }
    );
  }
}
