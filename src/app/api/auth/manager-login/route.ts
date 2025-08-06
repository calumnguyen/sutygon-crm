import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, storeSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashValue } from '@/lib/utils/hash';
import { decryptUserData } from '@/lib/utils/userEncryption';

export async function POST(req: NextRequest) {
  try {
    const { employeeKey, storeCode } = await req.json();

    if (!employeeKey || !storeCode) {
      return NextResponse.json(
        { error: 'Employee key and store code are required' },
        { status: 400 }
      );
    }

    // Hash the inputs
    const hashedEmployeeKey = hashValue(employeeKey);
    const hashedStoreCode = hashValue(storeCode);

    // Validate user exists and is admin
    const user = await db.query.users.findFirst({
      where: eq(users.employeeKey, hashedEmployeeKey),
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const decryptedUser = decryptUserData(user);

    if (
      decryptedUser.role.toLowerCase() !== 'admin' ||
      decryptedUser.status.toLowerCase() !== 'active'
    ) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate store code
    const store = await db.query.storeSettings.findFirst({});
    if (!store || store.storeCode !== hashedStoreCode) {
      return NextResponse.json({ error: 'Invalid store code' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: decryptedUser.name,
        role: decryptedUser.role.toLowerCase(),
      },
    });
  } catch (error) {
    console.error('Manager login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
