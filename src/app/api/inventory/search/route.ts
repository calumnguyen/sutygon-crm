import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes, orderItems, orders } from '@/lib/db/schema';
import { desc, and, isNotNull, lte, gte, or, eq, inArray } from 'drizzle-orm';
import {
  decryptInventoryData,
  decryptInventorySizeData,
  decryptField,
} from '@/lib/utils/inventoryEncryption';

// Helper function for Vietnamese text normalization
function normalizeVietnamese(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    console.log('Inventory search API called with:', { query, page, limit, dateFrom, dateTo });

    const offset = (page - 1) * limit;

    // Add timeout protection for large datasets
    let hasTimedOut = false;
    const searchTimeout = setTimeout(() => {
      hasTimedOut = true;
    }, 3000); // 3 second timeout for faster feedback

    // Use extremely small batches for maximum speed
    const BATCH_SIZE = 3; // Tiny batches for maximum speed
    const MAX_ITEMS_TO_SEARCH = 20; // Very small limit for speed
    const targetResults = Math.max(offset + limit, 5); // Minimal buffer for speed

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allResults: any[] = [];
    let processedCount = 0;
    let currentBatchOffset = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let overlappingOrderItems: any[] = [];

    // Get overlapping order items once if date range is specified
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      overlappingOrderItems = await db
        .select({
          inventoryItemId: orderItems.inventoryItemId,
          size: orderItems.size,
          quantity: orderItems.quantity,
          orderId: orderItems.orderId,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            isNotNull(orderItems.inventoryItemId),
            or(and(lte(orders.orderDate, toDate), gte(orders.expectedReturnDate, fromDate)))
          )
        );
    }

    // Process items in batches with early termination
    while (
      allResults.length < targetResults &&
      processedCount < MAX_ITEMS_TO_SEARCH &&
      !hasTimedOut
    ) {
      const batchItems = await db
        .select()
        .from(inventoryItems)
        .orderBy(desc(inventoryItems.createdAt))
        .limit(BATCH_SIZE)
        .offset(currentBatchOffset);

      if (!batchItems.length) break;

      // Get sizes for this batch
      const batchItemIds = batchItems.map((item) => item.id);
      const batchSizes = await db
        .select()
        .from(inventorySizes)
        .where(inArray(inventorySizes.itemId, batchItemIds));

      // Process each item in the batch
      for (const item of batchItems) {
        // Decrypt the item
        const decryptedItem = decryptInventoryData(item);

        // Early filtering - if we have a search query, check if it matches before doing expensive size processing
        if (query) {
          const searchQuery = query.toLowerCase().trim();

          // Quick match check
          const normalizedQuery = normalizeVietnamese(searchQuery);
          const normalizedName = normalizeVietnamese(decryptedItem.name);
          const normalizedCategory = normalizeVietnamese(decryptedItem.category);

          const queryWords = normalizedQuery.split(/\s+/).filter((word) => word.length > 0);
          const nameMatch = queryWords.some((word) => normalizedName.includes(word));
          const categoryMatch = queryWords.some((word) => normalizedCategory.includes(word));
          const exactNameMatch = decryptedItem.name.toLowerCase().includes(searchQuery);
          const exactCategoryMatch = decryptedItem.category.toLowerCase().includes(searchQuery);

          // If no match found, skip this item entirely
          if (!(nameMatch || categoryMatch || exactNameMatch || exactCategoryMatch)) {
            continue;
          }
        }

        // Apply category filter early
        if (category && decryptedItem.category.toLowerCase() !== category.toLowerCase()) {
          continue;
        }

        // Process sizes for this item (now we know it matches the search criteria)
        const itemSizes = batchSizes
          .filter((s) => s.itemId === item.id)
          .map((s) => {
            const decryptedSize = decryptInventorySizeData(s);

            // Calculate available stock
            const overlappingItems = overlappingOrderItems.filter(
              (oi) => oi.inventoryItemId === item.id
            );

            const sameSizeItems = overlappingItems.filter((oi) => {
              const normalize = (str: string) => str.replace(/[-_ ]/g, '').toLowerCase();

              let orderItemSize = oi.size;
              if (oi.size.includes(':')) {
                try {
                  orderItemSize = decryptField(oi.size);
                } catch {
                  orderItemSize = oi.size;
                }
              }

              const normalizedOrderSize = normalize(orderItemSize);
              const normalizedInventorySize = normalize(decryptedSize.title);

              return normalizedOrderSize === normalizedInventorySize;
            });

            const totalReserved = sameSizeItems.reduce((sum, item) => sum + item.quantity, 0);
            const onHand = parseInt(decryptedSize.onHand.toString(), 10);
            const available = Math.max(0, onHand - totalReserved);

            return {
              id: decryptedSize.id,
              title: decryptedSize.title,
              onHand,
              reserved: totalReserved,
              available,
            };
          });

        allResults.push({
          ...decryptedItem,
          sizes: itemSizes,
        });

        // Early termination if we have enough results
        if (allResults.length >= targetResults) {
          break;
        }
      }

      processedCount += batchItems.length;
      currentBatchOffset += BATCH_SIZE;

      // Break if we have enough results
      if (allResults.length >= targetResults) {
        break;
      }
    }

    // Clear timeout first
    clearTimeout(searchTimeout);

    // Check if search timed out
    if (hasTimedOut) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        totalPages: 0,
        hasMore: false,
        error:
          'Search timed out - too many items to process. Please try a more specific search term.',
        searchNote:
          'Search was limited due to performance. Try using more specific Vietnamese terms.',
      });
    }

    // Apply pagination to results
    const total = allResults.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = offset;
    const endIndex = startIndex + limit;
    const paginatedResults = allResults.slice(startIndex, endIndex);

    return NextResponse.json({
      items: paginatedResults,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
      searchNote:
        processedCount >= MAX_ITEMS_TO_SEARCH
          ? `Search limited to ${MAX_ITEMS_TO_SEARCH} most recent items for performance. Use more specific terms for better results.`
          : undefined,
    });
  } catch (error) {
    console.error('Error in inventory search:', error);
    return NextResponse.json({ error: 'Failed to search inventory' }, { status: 500 });
  }
}
