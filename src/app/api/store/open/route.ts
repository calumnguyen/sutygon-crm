import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storeSettings, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashValue } from '@/lib/utils/hash';
import { decryptUserData } from '@/lib/utils/userEncryption';

export async function POST(req: NextRequest) {
  try {
    // Get current user from localStorage (passed in request body)
    const { currentUser } = await req.json();

    if (!currentUser || !currentUser.employeeKey) {
      return NextResponse.json({ error: 'User session required' }, { status: 401 });
    }

    // Find the actual user in database to get the real ID
    const hashedEmployeeKey = hashValue(currentUser.employeeKey);
    const user = await db.query.users.findFirst({
      where: eq(users.employeeKey, hashedEmployeeKey),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const decryptedUser = decryptUserData(user);

    // Update store status
    const store = await db.query.storeSettings.findFirst({});
    if (!store) {
      return NextResponse.json({ error: 'Store settings not found' }, { status: 404 });
    }

    await db
      .update(storeSettings)
      .set({
        isOpen: true,
        openedBy: user.id,
        openedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, store.id));

    return NextResponse.json({
      success: true,
      storeStatus: 'open',
      openedBy: decryptedUser.name,
      openedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to open store:', error);
    return NextResponse.json({ error: 'Failed to open store' }, { status: 500 });
  }
}
