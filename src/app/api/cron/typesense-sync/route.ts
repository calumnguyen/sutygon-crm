import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems } from '@/lib/db/schema';
import typesenseService from '@/lib/typesense';
import { typesenseInventorySync } from '@/lib/typesense/sync';

export async function GET() {
  try {
    console.log('🕕 Starting scheduled Typesense sync...');

    // Check if Typesense is available
    const connected = await typesenseService.connect();
    if (!connected) {
      console.log('❌ Typesense not available, skipping scheduled sync');
      return NextResponse.json({ error: 'Typesense không khả dụng' }, { status: 503 });
    }

    // Get all inventory item IDs
    const items = await db.select({ id: inventoryItems.id }).from(inventoryItems);
    const itemIds = items.map((item) => item.id);

    if (itemIds.length === 0) {
      console.log('ℹ️ No items to sync');
      return NextResponse.json(
        { message: 'Không có sản phẩm nào để đồng bộ', syncedCount: 0 },
        { status: 200 }
      );
    }

    console.log(`🔄 Syncing ${itemIds.length} items to Typesense...`);

    // Perform bulk sync with minimal logging for cron
    await typesenseInventorySync.syncMultipleItems(itemIds);

    console.log(`✅ Scheduled Typesense sync completed: ${itemIds.length} items synced`);

    return NextResponse.json({
      message: 'Đồng bộ Typesense theo lịch thành công',
      syncedCount: itemIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Scheduled Typesense sync error:', error);
    return NextResponse.json(
      { error: 'Có lỗi xảy ra khi đồng bộ Typesense theo lịch' },
      { status: 500 }
    );
  }
}
