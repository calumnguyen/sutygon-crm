import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashValue } from '@/lib/utils/hash';
import { decryptUserData } from '@/lib/utils/userEncryption';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeKey = searchParams.get('employeeKey');
  console.log('API /api/users/by-key called with employeeKey:', employeeKey);
  if (!employeeKey) {
    return NextResponse.json({ user: null });
  }

  // Hash the input employee key
  const hashedEmployeeKey = hashValue(employeeKey);
  
  const user = await db.query.users.findFirst({
    where: eq(users.employeeKey, hashedEmployeeKey),
  });
  console.log('User found:', user);
  if (!user) {
    return NextResponse.json({ user: null });
  }
  // Decrypt user data and return the original employee key
  const decryptedUser = decryptUserData(user);
  return NextResponse.json({
    user: {
      id: user.id,
      name: decryptedUser.name,
      employeeKey: employeeKey, // Return original key, not hashed
      role: decryptedUser.role.toLowerCase(),
      status: decryptedUser.status.toLowerCase(),
    },
  });
}
