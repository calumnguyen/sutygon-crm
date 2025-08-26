import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptUserData } from '@/lib/utils/userEncryption';

export async function GET() {
  try {
    const store = await db.query.storeSettings.findFirst({});

    if (!store) {
      return NextResponse.json({
        isOpen: false,
        openedBy: null,
        openedAt: null,
        closedBy: null,
        closedAt: null,
      });
    }

    let openedByName = null;
    let closedByName = null;

    // If store was opened by someone, get their name
    if (store.openedBy) {
      const opener = await db.query.users.findFirst({
        where: eq(users.id, store.openedBy),
      });

      if (opener) {
        const decryptedOpener = decryptUserData(opener);
        openedByName = decryptedOpener.name;
      }
    }

    // If store was closed by someone, get their name
    if (store.closedBy) {
      const closer = await db.query.users.findFirst({
        where: eq(users.id, store.closedBy),
      });

      if (closer) {
        const decryptedCloser = decryptUserData(closer);
        closedByName = decryptedCloser.name;
      }
    }

    return NextResponse.json({
      isOpen: store.isOpen || false,
      openedBy: openedByName,
      openedAt: store.openedAt || null,
      closedBy: closedByName,
      closedAt: store.closedAt || null,
    });
  } catch (error) {
    console.error('Failed to fetch store status:', error);
    return NextResponse.json({ error: 'Failed to fetch store status' }, { status: 500 });
  }
}
