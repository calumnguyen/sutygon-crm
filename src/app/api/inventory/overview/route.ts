import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes } from '@/lib/db/schema';
import { count } from 'drizzle-orm';
import { decryptInventorySizeData } from '@/lib/utils/inventoryEncryption';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Get total unique items (models)
    const [totalModelsResult] = await db.select({ count: count() }).from(inventoryItems);

    const totalModels = totalModelsResult.count;

    // Get all inventory sizes to calculate total onHand
    const allSizes = await db.select().from(inventorySizes);

    // Decrypt and sum all onHand quantities
    let totalProducts = 0;
    for (const size of allSizes) {
      const decryptedSize = decryptInventorySizeData(size);
      const onHandQty = parseInt(String(decryptedSize.onHand), 10) || 0;
      totalProducts += onHandQty;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalModels,
        totalProducts,
      },
    });
  } catch (error) {
    console.error('Inventory overview API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch inventory overview',
      },
      { status: 500 }
    );
  }
});
