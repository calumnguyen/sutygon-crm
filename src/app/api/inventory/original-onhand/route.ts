import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventorySizes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptInventorySizeData } from '@/lib/utils/inventoryEncryption';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inventoryItemId = searchParams.get('inventoryItemId');
    const size = searchParams.get('size');

    if (!inventoryItemId || !size) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get the original on-hand quantity from database
    const sizeData = await db
      .select({
        itemId: inventorySizes.itemId,
        title: inventorySizes.title,
        quantity: inventorySizes.quantity,
        onHand: inventorySizes.onHand,
        price: inventorySizes.price,
      })
      .from(inventorySizes)
      .where(eq(inventorySizes.itemId, parseInt(inventoryItemId)));

    // Find the matching size and get original on-hand
    const normalize = (str: string) => str.replace(/[-_ ]/g, '').toLowerCase();
    const matchingSize = sizeData.find((s) => {
      try {
        const decryptedSize = decryptInventorySizeData(s);
        return normalize(decryptedSize.title) === normalize(size);
      } catch (e) {
        console.error('Error decrypting size:', e);
        return false;
      }
    });

    if (!matchingSize) {
      return NextResponse.json({ originalOnHand: 0 });
    }

    const decryptedSize = decryptInventorySizeData(matchingSize);
    const originalOnHand = parseInt(decryptedSize.onHand.toString(), 10);

    return NextResponse.json({ originalOnHand });
  } catch (error) {
    console.error('Error fetching original on-hand:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
