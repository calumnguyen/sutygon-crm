import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { key } = await req.json();
  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  }

  const store = await db.query.storeSettings.findFirst({});
  if (!store) {
    return NextResponse.json({ error: 'Store settings not found' }, { status: 404 });
  }

  if (store.storeCode === key) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: 'Incorrect store code' }, { status: 401 });
  }
}
