import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashValue } from '@/lib/utils/hash';
import { decryptUserData } from '@/lib/utils/userEncryption';
import { createSession } from '@/lib/utils/sessionManager';

export async function POST(req: NextRequest) {
  try {
    const { employeeKey } = await req.json();

    if (!employeeKey) {
      return NextResponse.json({ error: 'Employee key is required' }, { status: 400 });
    }

    // Hash the employee key
    const hashedEmployeeKey = hashValue(employeeKey);

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.employeeKey, hashedEmployeeKey),
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid employee key' }, { status: 401 });
    }

    // Decrypt user data
    const decryptedUser = decryptUserData(user);

    if (decryptedUser.status.toLowerCase() !== 'active') {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    // Check store status
    const store = await db.query.storeSettings.findFirst({});
    const isStoreOpen = store?.isOpen || false;
    const userRole = decryptedUser.role.toLowerCase();

    // If store is closed and user is not admin, deny access
    if (!isStoreOpen && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'STORE_CLOSED', message: 'Store is closed. Contact manager.' },
        { status: 403 }
      );
    }

    // Create session
    const userAgent = req.headers.get('user-agent') || undefined;
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || undefined;

    const sessionToken = await createSession(user.id, userAgent, ipAddress);

    // Successful login
    return NextResponse.json({
      success: true,
      sessionToken,
      user: {
        id: user.id,
        name: decryptedUser.name,
        role: userRole,
        employeeKey: employeeKey, // Return original key, not hashed
        status: decryptedUser.status,
      },
      storeStatus: isStoreOpen ? 'open' : 'closed',
    });
  } catch (error) {
    console.error('Employee login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
