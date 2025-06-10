import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storeSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const store = await db.query.storeSettings.findFirst({});
  if (!store) {
    return NextResponse.json({ storeCode: null, updatedAt: null });
  }
  return NextResponse.json({ storeCode: store.storeCode, updatedAt: store.updatedAt });
}

export async function PATCH(req: NextRequest) {
  const { newCode } = await req.json();
  if (!/^[0-9]{8}$/.test(newCode)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }
  const store = await db.query.storeSettings.findFirst({});
  if (!store) {
    return NextResponse.json({ error: 'Store settings not found' }, { status: 404 });
  }
  await db
    .update(storeSettings)
    .set({ storeCode: newCode, updatedAt: new Date() })
    .where(eq(storeSettings.id, store.id));
  return NextResponse.json({ success: true });
}
