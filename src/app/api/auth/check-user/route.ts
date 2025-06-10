import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const { employeeKey } = await request.json();

  // Query the database for an active user with the given employee key
  const user = await db.query.users.findFirst({
    where: (user, { eq }) => eq(user.employeeKey, employeeKey),
  });

  if (user && user.status === 'active') {
    return NextResponse.json({ exists: true, isActive: true });
  }

  return NextResponse.json({ exists: false, isActive: false });
}
