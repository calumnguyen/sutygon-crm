import { NextRequest, NextResponse } from 'next/server';
import typesenseInventorySync from '@/lib/typesense/sync';
import typesenseService from '@/lib/typesense';
import { db } from '@/lib/db';
import { inventoryItems } from '@/lib/db/schema';

// Global flag to prevent multiple simultaneous sync operations
let isSyncing = false;

export async function POST(request: NextRequest) {
  try {
    // Prevent multiple simultaneous sync operations
    if (isSyncing) {
      return NextResponse.json({ error: 'Đồng bộ đang chạy, vui lòng đợi...' }, { status: 429 });
    }
    isSyncing = true;

    // Check if client wants real-time streaming
    const acceptHeader = request.headers.get('accept');
    const isStreaming = acceptHeader?.includes('text/event-stream');

    if (isStreaming) {
      // Return SSE stream for real-time logs
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          const sendEvent = (data: Record<string, unknown>) => {
            const event = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(event));
          };

          const onLog = (log: string) => {
            sendEvent({ type: 'log', message: log });
          };

          try {
            // Get all inventory item IDs first
            const items = await db.select({ id: inventoryItems.id }).from(inventoryItems);
            const itemIds = items.map((item) => item.id);

            if (itemIds.length === 0) {
              sendEvent({ type: 'complete', syncedCount: 0, totalItems: 0, failedCount: 0 });
              controller.close();
              return;
            }

            const onProgress = (current: number, total: number) => {
              sendEvent({
                type: 'progress',
                current,
                total,
                percentage: Math.round((current / total) * 100),
              });
            };

            // Start the sync process
            const result = await typesenseInventorySync.syncMultipleItems(
              itemIds,
              onProgress,
              onLog
            );

            sendEvent({
              type: 'complete',
              syncedCount: result.synced,
              totalItems: result.total,
              failedCount: result.failed,
            });
            controller.close();
          } catch (error: unknown) {
            sendEvent({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            controller.close();
          } finally {
            isSyncing = false;
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // Original non-streaming implementation
      const logs: string[] = [];

      const onLog = (log: string) => {
        logs.push(log);
      };

      // Get all inventory item IDs first
      const items = await db.select({ id: inventoryItems.id }).from(inventoryItems);
      const itemIds = items.map((item) => item.id);

      if (itemIds.length === 0) {
        return NextResponse.json({
          message: 'Không có sản phẩm nào để đồng bộ',
          syncedCount: 0,
          totalItems: 0,
          failedCount: 0,
          logs,
        });
      }

      const onProgress = () => {
        // Progress tracking for non-streaming mode
      };

      const result = await typesenseInventorySync.syncMultipleItems(itemIds, onProgress, onLog);

      const message = `Đồng bộ thành công: ${result.synced} sản phẩm (${result.failed} lỗi)`;

      return NextResponse.json({
        message,
        syncedCount: result.synced,
        totalItems: result.total,
        failedCount: result.failed,
        logs,
      });
    }
  } catch (error: unknown) {
    isSyncing = false;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Có lỗi xảy ra khi đồng bộ' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check Typesense connection status
    const connected = await typesenseService.connect();

    if (!connected) {
      return NextResponse.json({
        status: 'unavailable',
        message: 'Typesense không khả dụng',
      });
    }

    // Get basic stats
    const items = await db.select({ id: inventoryItems.id }).from(inventoryItems);
    const totalItems = items.length;

    // Try to get Typesense collection info
    let typesenseCount = 0;
    try {
      const collection = await typesenseService.getCollection('inventory_items');
      typesenseCount = (collection.num_documents as number) || 0;
    } catch (error) {
      console.warn('Could not get Typesense collection info:', error);
    }

    return NextResponse.json({
      status: 'available',
      totalItems,
      typesenseCount,
      lastSync: new Date().toISOString(), // You might want to store this in a database
    });
  } catch (error) {
    console.error('Typesense status check error:', error);
    return NextResponse.json(
      { error: 'Có lỗi khi kiểm tra trạng thái Typesense' },
      { status: 500 }
    );
  }
}
