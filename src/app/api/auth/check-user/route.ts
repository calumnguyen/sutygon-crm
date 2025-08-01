import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashValue } from '@/lib/utils/hash';
import { decryptUserData } from '@/lib/utils/userEncryption';

export async function POST(request: Request) {
  const { employeeKey } = await request.json();

  // Hash the input employee key
  const hashedEmployeeKey = hashValue(employeeKey);

  // Query the database for an active user with the given employee key
  const user = await db.query.users.findFirst({
    where: (user, { eq }) => eq(user.employeeKey, hashedEmployeeKey),
  });

  if (user) {
    const decryptedUser = decryptUserData(user);
    if (decryptedUser.status.toLowerCase() === 'active') {
    return NextResponse.json({ exists: true, isActive: true });
    }
  }

  return NextResponse.json({ exists: false, isActive: false });
}
