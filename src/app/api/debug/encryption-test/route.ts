import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/utils/encryption';

export async function GET() {
  try {
    const testName = 'Calum';
    const testRole = 'admin';
    const testStatus = 'active';

    const encryptedName = encrypt(testName);
    const encryptedRole = encrypt(testRole);
    const encryptedStatus = encrypt(testStatus);

    return NextResponse.json({
      message: 'Encryption test',
      name: {
        original: testName,
        encrypted: encryptedName,
        decrypted: decrypt(encryptedName),
        isWorking: testName === decrypt(encryptedName),
      },
      role: {
        original: testRole,
        encrypted: encryptedRole,
        decrypted: decrypt(encryptedRole),
        isWorking: testRole === decrypt(encryptedRole),
      },
      status: {
        original: testStatus,
        encrypted: encryptedStatus,
        decrypted: decrypt(encryptedStatus),
        isWorking: testStatus === decrypt(encryptedStatus),
      },
      encryptionKey: process.env.ENCRYPTION_KEY ? 'Set' : 'Not set',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Encryption test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
