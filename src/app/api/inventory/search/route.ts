import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  inventoryItems,
  inventorySizes,
  inventoryTags,
  tags,
  orderItems,
  orders,
} from '@/lib/db/schema';
import { inArray, desc, isNotNull, and, or, lte, gte, eq } from 'drizzle-orm';
import {
  decryptInventoryData,
  decryptInventorySizeData,
  decryptTagData,
  decryptField,
} from '@/lib/utils/inventoryEncryption';
// import { monitorDatabaseQuery } from '@/lib/utils/performance';

// Helper: get formatted ID (e.g., AD-000001)
function getFormattedId(category: string, categoryCounter: number) {
  let code = (category || 'XX')
    .split(' ')
    .map((w: string) => w[0])
    .join('');
  // Replace Đ/đ with D/d, then remove diacritics
  code = code.replace(/Đ/g, 'D').replace(/đ/g, 'd');
  code = code
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\u0300-\u036f/g, '');
  code = code.toUpperCase().slice(0, 2);
  return `${code}-${String(categoryCounter).padStart(6, '0')}`;
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

    console.log('Inventory search API called with:', { dateFrom, dateTo });

    const offset = (page - 1) * limit;

    // Get all items first since we need to decrypt to search
    const allItems = await db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));

    if (!allItems.length) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        totalPages: 0,
        hasMore: false,
      });
    }

    // Get all sizes for these items
    const itemIds = allItems.map((item) => item.id);
    const sizes = await db
      .select()
      .from(inventorySizes)
      .where(inArray(inventorySizes.itemId, itemIds));

    // Get order items that overlap with the date range
    let overlappingOrderItems = [];
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      console.log('Date range for overlapping orders:', { fromDate, toDate });

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
            // Check if order dates overlap with the requested date range
            or(
              // Order starts before our range ends AND order ends after our range starts
              and(lte(orders.orderDate, toDate), gte(orders.expectedReturnDate, fromDate))
            )
          )
        );

      console.log('Overlapping order items found:', overlappingOrderItems.length);
      console.log('Overlapping items:', overlappingOrderItems);

      // Also check if there are any orders at all
      const allOrders = await db.select().from(orders);
      console.log('Total orders in database:', allOrders.length);
      if (allOrders.length > 0) {
        console.log(
          'All order dates:',
          allOrders.map((o) => ({
            id: o.id,
            orderDate: o.orderDate,
            expectedReturnDate: o.expectedReturnDate,
            status: o.status,
          }))
        );
      }

      // Check specifically for order 64
      const order64 = allOrders.find((o) => o.id === 64);
      if (order64) {
        console.log('Order 64 found:', {
          id: order64.id,
          orderDate: order64.orderDate,
          expectedReturnDate: order64.expectedReturnDate,
          status: order64.status,
        });

        // Check if it should overlap
        const orderStart = new Date(order64.orderDate);
        const orderEnd = new Date(order64.expectedReturnDate);
        const startsBeforeEnd = orderStart <= toDate;
        const endsAfterStart = orderEnd >= fromDate;
        const overlaps = startsBeforeEnd && endsAfterStart;

        console.log('Order 64 overlap check:', {
          orderStart,
          orderEnd,
          fromDate,
          toDate,
          startsBeforeEnd,
          endsAfterStart,
          overlaps,
        });
      }
    } else {
      // If no date range, get all order items
      overlappingOrderItems = await db
        .select({
          inventoryItemId: orderItems.inventoryItemId,
          size: orderItems.size,
          quantity: orderItems.quantity,
          orderId: orderItems.orderId,
        })
        .from(orderItems)
        .where(isNotNull(orderItems.inventoryItemId));

      console.log('All order items found (no date range):', overlappingOrderItems.length);
    }

    // Get all tags for these items
    const invTags = await db
      .select()
      .from(inventoryTags)
      .where(inArray(inventoryTags.itemId, itemIds));

    // Get tag names
    const tagIds = invTags.map((t) => t.tagId);
    const allTags = tagIds.length
      ? await db.select().from(tags).where(inArray(tags.id, tagIds))
      : [];

    // Build result with decryption and filtering
    const allResults = allItems.map((item) => {
      const decryptedItem = decryptInventoryData(item);

      const itemSizes = sizes
        .filter((s) => s.itemId === item.id)
        .map((s) => {
          const decryptedSize = decryptInventorySizeData(s);

          // Calculate available stock by subtracting overlapping orders
          const overlappingItems = overlappingOrderItems.filter(
            (oi) => oi.inventoryItemId === item.id
          );

          // Find items with the same size
          const sameSizeItems = overlappingItems.filter((oi) => {
            const normalize = (str: string) => str.replace(/[-_ ]/g, '').toLowerCase();

            // Decrypt the order item size if it's encrypted
            let orderItemSize = oi.size;
            if (oi.size.includes(':')) {
              try {
                orderItemSize = decryptField(oi.size);
              } catch {
                orderItemSize = oi.size; // Use original if decryption fails
              }
            }

            const normalizedOrderSize = normalize(orderItemSize);
            const normalizedInventorySize = normalize(decryptedSize.title);

            return normalizedOrderSize === normalizedInventorySize;
          });

          // Calculate total reserved quantity for this size
          const totalReserved = sameSizeItems.reduce((sum, item) => sum + item.quantity, 0);

          // Calculate available stock (onHand - reserved)
          const onHand = parseInt(decryptedSize.onHand.toString(), 10);
          const availableStock = Math.max(0, onHand - totalReserved);

          return {
            title: decryptedSize.title,
            quantity: decryptedSize.quantity,
            onHand: availableStock.toString(), // Return available stock instead of raw onHand
            price: decryptedSize.price,
          };
        });

      const itemTagIds = invTags.filter((t) => t.itemId === item.id).map((t) => t.tagId);

      const itemTags = allTags
        .filter((t) => itemTagIds.includes(t.id))
        .map((t) => {
          const decryptedTag = decryptTagData(t);
          return decryptedTag.name;
        });

      return {
        id: item.id,
        formattedId: getFormattedId(decryptedItem.category, item.categoryCounter),
        name: decryptedItem.name,
        category: decryptedItem.category,
        imageUrl: item.imageUrl,
        tags: itemTags,
        sizes: itemSizes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    // Filter results based on search query
    let filteredResults = allResults;

    if (query.trim()) {
      const searchQuery = query.toLowerCase();
      const idPattern = query.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      filteredResults = allResults.filter((item) => {
        // Search by formatted ID (exact match or partial)
        const itemId = item.formattedId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const idMatch =
          itemId.includes(idPattern) || item.formattedId.toLowerCase().includes(searchQuery);

        // Normalize Vietnamese text for better matching
        const normalizeVietnamese = (str: string) => {
          return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[đ]/g, 'd') // Replace đ with d
            .replace(/[Đ]/g, 'D'); // Replace Đ with D
        };

        const normalizedQuery = normalizeVietnamese(searchQuery);
        const normalizedName = normalizeVietnamese(item.name);
        const normalizedCategory = normalizeVietnamese(item.category);

        // Check if all words in the query are found in the name or category
        const queryWords = normalizedQuery.split(/\s+/).filter((word) => word.length > 0);
        const nameMatch = queryWords.every((word) => normalizedName.includes(word));
        const categoryMatch = queryWords.every((word) => normalizedCategory.includes(word));

        // Original exact matching for backward compatibility
        const exactNameMatch = item.name.toLowerCase().includes(searchQuery);
        const exactCategoryMatch = item.category.toLowerCase().includes(searchQuery);

        // Search by tags
        const tagMatch = item.tags.some((tag) => {
          const normalizedTag = normalizeVietnamese(tag);
          return queryWords.every((word) => normalizedTag.includes(word));
        });

        if (
          idMatch ||
          nameMatch ||
          categoryMatch ||
          exactNameMatch ||
          exactCategoryMatch ||
          tagMatch
        )
          return true;

        return false;
      });
    }

    if (category) {
      filteredResults = filteredResults.filter(
        (item) => item.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Apply pagination
    const total = filteredResults.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = offset;
    const endIndex = startIndex + limit;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);

    return NextResponse.json({
      items: paginatedResults,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (error) {
    console.error('Error in inventory search:', error);
    return NextResponse.json({ error: 'Failed to search inventory' }, { status: 500 });
  }
}
