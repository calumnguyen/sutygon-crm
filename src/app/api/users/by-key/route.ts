import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeKey = searchParams.get('employeeKey');
  console.log('API /api/users/by-key called with employeeKey:', employeeKey);
  if (!employeeKey) {
    return NextResponse.json({ user: null });
  }
  const user = await db.query.users.findFirst({
    where: eq(users.employeeKey, employeeKey),
  });
  console.log('User found:', user);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  // Only return safe fields
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      employeeKey: user.employeeKey,
      role: user.role,
      status: user.status,
    },
  });
}
