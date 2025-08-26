import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  inventoryItems,
  inventorySizes,
  tags,
  inventoryTags,
  categoryCounters,
} from '@/lib/db/schema';
import { eq, inArray, sql, desc, asc } from 'drizzle-orm';
import {
  encryptInventoryData,
  decryptInventoryData,
  encryptInventorySizeData,
  decryptInventorySizeData,
  encryptTagData,
  decryptTagData,
} from '@/lib/utils/inventoryEncryption';

import { typesenseInventorySync } from '@/lib/typesense/sync';
import { logDatabaseError } from '@/lib/utils/errorMonitor';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';

// Define a minimal InventoryItem type for this context
// interface InventoryItemForId {
//   id: number;
//   category: string;
// }

// Category code mapping for consistent IDs
const CATEGORY_CODE_MAP: Record<string, string> = {
  'Áo Dài': 'AD',
  Áo: 'AO',
  Quần: 'QU',
  'Văn Nghệ': 'VN',
  'Đồ Tây': 'DT',
  Giầy: 'GI',
  'Dụng Cụ': 'DC',
  'Đầm Dạ Hội': 'DH',
};

// Helper: get formatted ID (e.g., AD-000001)
function getFormattedId(category: string, categoryCounter: number) {
  let code = CATEGORY_CODE_MAP[category];
  if (!code) {
    // Fallback for unknown categories - generate from first letters
    code = (category || 'XX')
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
  }
  return `${code}-${String(categoryCounter).padStart(6, '0')}`;
}

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  const page = parseInt(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sortBy') || 'newest'; // Default to newest first

  try {
    // Get items with pagination, sorted according to sortBy parameter
    const items = await db
      .select()
      .from(inventoryItems)
      .orderBy(sortBy === 'oldest' ? asc(inventoryItems.createdAt) : desc(inventoryItems.createdAt))
      .limit(limit)
      .offset(offset);

    console.log(`🔍 Main inventory route - sortBy: ${sortBy}, items count: ${items.length}`);
    if (items.length > 0) {
      console.log(
        '🔍 First 3 items from main inventory route:',
        items.slice(0, 3).map((item) => ({
          id: item.id,
          createdAt: item.createdAt,
          categoryCounter: item.categoryCounter,
        }))
      );
    }

    if (!items.length) {
      return NextResponse.json({ items: [], hasMore: false, total: 0 });
    }

    // Get total count efficiently
    const totalResult = await db.select({ count: sql<number>`count(*)` }).from(inventoryItems);
    const total = totalResult[0]?.count || 0;

    // Get all sizes for these items in a single query
    const sizes = await db
      .select()
      .from(inventorySizes)
      .where(
        inArray(
          inventorySizes.itemId,
          items.map((i) => i.id)
        )
      );

    // Get all inventory_tags for these items in a single query
    const invTags = await db
      .select()
      .from(inventoryTags)
      .where(
        inArray(
          inventoryTags.itemId,
          items.map((i) => i.id)
        )
      );

    // Get all tags for these tag ids in a single query
    const tagIds = invTags.map((t) => t.tagId);
    let allTags: Array<{ id: number; name: string }> = [];

    try {
      allTags = tagIds.length ? await db.select().from(tags).where(inArray(tags.id, tagIds)) : [];
    } catch (tagError) {
      console.warn('Failed to fetch tags for inventory items:', tagError);
      // Continue with empty tags rather than failing the entire request
    }

    // Create a map for quick tag lookup
    const tagMap = new Map(allTags.map((tag) => [tag.id, tag]));

    // Process items with decryption
    const processedItems = items.map((item) => {
      const decryptedItem = decryptInventoryData(item);

      // Get sizes for this item
      const itemSizes = sizes.filter((size) => size.itemId === item.id);
      const decryptedSizes = itemSizes.map((size) => {
        const decryptedSize = decryptInventorySizeData(size);
        return {
          title: decryptedSize.title,
          quantity: decryptedSize.quantity,
          onHand: decryptedSize.onHand,
          price: decryptedSize.price,
        };
      });

      // Get tags for this item
      const itemInvTags = invTags.filter((t) => t.itemId === item.id);
      const itemTags = itemInvTags
        .map((t) => {
          const tag = tagMap.get(t.tagId);
          if (tag) {
            const decryptedTag = decryptTagData(tag);
            return decryptedTag.name;
          }
          return null;
        })
        .filter((tag) => tag !== null) as string[];

      return {
        id: item.id,
        formattedId: getFormattedId(decryptedItem.category, item.categoryCounter),
        name: decryptedItem.name,
        category: decryptedItem.category,
        imageUrl: item.imageUrl, // Use as-is for now to avoid decryption issues
        tags: itemTags,
        sizes: decryptedSizes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    const hasMore = offset + limit < total;

    return NextResponse.json({
      items: processedItems,
      hasMore,
      total,
      page,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch inventory items:', error);

    // Check if it's a connection error
    if (
      error instanceof Error &&
      (error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('fetch failed') ||
        error.message.includes('other side closed'))
    ) {
      return NextResponse.json(
        { error: 'Database connection issue. Please try again in a moment.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to fetch inventory items' }, { status: 500 });
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  const requestId = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log(`[${requestId}] 🆕 Inventory item creation started`);

  try {
    const body = await req.json();
    // Expect: { name, category, imageUrl, tags: string[], sizes: [{title, quantity, onHand, price}], addedBy?: number }
    const { name, category, imageUrl, tags: tagNames, sizes, addedBy } = body;

    console.log(`[${requestId}] 📋 Request data:`, {
      name: name ? `${name.substring(0, 20)}...` : 'null',
      category,
      hasImage: !!imageUrl,
      tagCount: tagNames?.length || 0,
      sizeCount: sizes?.length || 0,
      addedBy,
      timestamp: new Date().toISOString(),
    });

    // Use the provided user ID and current time if user is provided
    const currentUserId = addedBy || null;
    const currentTime = currentUserId ? new Date() : null;

    console.log(`[${requestId}] 🔐 User context:`, { currentUserId, currentTime });

    // Encrypt the category for counter lookup
    const encryptedCategory = encryptInventoryData({ name: '', category }).category;
    console.log(
      `[${requestId}] 🔒 Encrypted category:`,
      encryptedCategory.substring(0, 20) + '...'
    );

    // Try to increment the counter for the category
    let categoryCounter: number;

    try {
      console.log(`[${requestId}] 🔍 Looking up category counter...`);
      // First try to find existing counter with encrypted category
      const [counter] = await db
        .select()
        .from(categoryCounters)
        .where(eq(categoryCounters.category, encryptedCategory));

      if (counter) {
        console.log(`[${requestId}] 📊 Found existing counter:`, counter.counter);
        // Update existing counter
        const [updatedCounter] = await db
          .update(categoryCounters)
          .set({ counter: sql`${categoryCounters.counter} + 1` })
          .where(eq(categoryCounters.category, encryptedCategory))
          .returning({ counter: categoryCounters.counter });
        categoryCounter = updatedCounter.counter;
        console.log(`[${requestId}] ✅ Updated counter to:`, categoryCounter);
      } else {
        console.log(`[${requestId}] 🆕 Creating new category counter`);
        // If counter doesn't exist, create it and use 1
        await db.insert(categoryCounters).values({ category: encryptedCategory, counter: 1 });
        categoryCounter = 1;
        console.log(`[${requestId}] ✅ Created new counter:`, categoryCounter);
      }
    } catch (counterError) {
      console.error(`[${requestId}] ❌ Category counter operation failed:`, {
        error: counterError instanceof Error ? counterError.message : String(counterError),
        stack: counterError instanceof Error ? counterError.stack : undefined,
        category: encryptedCategory.substring(0, 20) + '...',
        timestamp: new Date().toISOString(),
      });

      // Log to error monitor
      await logDatabaseError(
        requestId,
        counterError instanceof Error ? counterError : new Error(String(counterError)),
        {
          operation: 'category_counter_lookup',
          endpoint: '/api/inventory',
          user: { id: currentUserId },
        }
      );

      throw new Error(
        `Category counter operation failed: ${counterError instanceof Error ? counterError.message : String(counterError)}`
      );
    }

    // Encrypt inventory data before storing
    const encryptedInventoryData = encryptInventoryData({
      name,
      category,
      categoryCounter,
      imageUrl,
    });

    console.log(`[${requestId}] 🔒 Encrypted inventory data prepared`);

    // Insert item with encrypted data and tracking info
    let item;
    try {
      console.log(`[${requestId}] 💾 Inserting inventory item...`);
      [item] = await db
        .insert(inventoryItems)
        .values({
          name: encryptedInventoryData.name,
          category: encryptedInventoryData.category,
          categoryCounter: categoryCounter,
          imageUrl,
          addedBy: currentUserId,
          addedAt: currentTime,
        })
        .returning();

      console.log(`[${requestId}] ✅ Inventory item created with ID:`, item.id);
    } catch (insertError) {
      console.error(`[${requestId}] ❌ Inventory item insertion failed:`, {
        error: insertError instanceof Error ? insertError.message : String(insertError),
        stack: insertError instanceof Error ? insertError.stack : undefined,
        itemData: {
          nameLength: name?.length || 0,
          categoryLength: category?.length || 0,
          hasImage: !!imageUrl,
          categoryCounter,
          addedBy: currentUserId,
          addedAt: currentTime,
        },
        timestamp: new Date().toISOString(),
      });
      throw new Error(
        `Inventory item insertion failed: ${insertError instanceof Error ? insertError.message : String(insertError)}`
      );
    }

    // Insert sizes with encrypted data
    if (sizes && sizes.length) {
      try {
        console.log(`[${requestId}] 📏 Inserting ${sizes.length} sizes...`);
        const encryptedSizes = sizes.map(
          (s: { title: string; quantity: number; onHand: number; price: number }) => {
            const encryptedSize = encryptInventorySizeData({
              ...s,
              itemId: item.id,
            });
            return {
              title: encryptedSize.title,
              quantity: encryptedSize.quantity,
              onHand: encryptedSize.onHand,
              price: encryptedSize.price,
              itemId: item.id,
            };
          }
        );

        await db.insert(inventorySizes).values(encryptedSizes);
        console.log(`[${requestId}] ✅ Sizes inserted successfully`);
      } catch (sizeError) {
        console.error(`[${requestId}] ❌ Size insertion failed:`, {
          error: sizeError instanceof Error ? sizeError.message : String(sizeError),
          stack: sizeError instanceof Error ? sizeError.stack : undefined,
          itemId: item.id,
          sizeCount: sizes.length,
          sizes: sizes.map(
            (s: { title: string; quantity: number; onHand: number; price: number }) => ({
              title: s.title,
              quantity: s.quantity,
              onHand: s.onHand,
              price: s.price,
            })
          ),
          timestamp: new Date().toISOString(),
        });
        // Continue without sizes rather than failing the entire operation
        console.warn(`[${requestId}] ⚠️ Continuing without sizes due to insertion failure`);
      }
    }

    // Insert tags (create if not exist) with encrypted names
    const tagIds: number[] = [];
    if (tagNames && tagNames.length) {
      try {
        console.log(`[${requestId}] 🏷️ Processing ${tagNames.length} tags...`);

        // Deduplicate tag names to prevent duplicate insertions
        const uniqueTagNames = [...new Set(tagNames as string[])];
        console.log(`[${requestId}] 🔍 Deduplicated to ${uniqueTagNames.length} unique tags`);

        for (const tagName of uniqueTagNames) {
          // Encrypt tag name for lookup
          const encryptedTagName = encryptTagData({ name: tagName }).name;

          let [tag] = await db.select().from(tags).where(eq(tags.name, encryptedTagName));
          if (!tag) {
            console.log(`[${requestId}] 🆕 Creating new tag:`, tagName);
            [tag] = await db.insert(tags).values({ name: encryptedTagName }).returning();
          }
          tagIds.push(tag.id);
        }

        console.log(`[${requestId}] 🔗 Inserting ${tagIds.length} tag associations...`);
        // Insert into inventory_tags
        await db.insert(inventoryTags).values(tagIds.map((tagId) => ({ itemId: item.id, tagId })));
        console.log(`[${requestId}] ✅ Tags inserted successfully`);
      } catch (tagError) {
        console.error(`[${requestId}] ❌ Tag insertion failed:`, {
          error: tagError instanceof Error ? tagError.message : String(tagError),
          stack: tagError instanceof Error ? tagError.stack : undefined,
          itemId: item.id,
          tagNames,
          tagCount: tagNames.length,
          timestamp: new Date().toISOString(),
        });
        // Continue without tags rather than failing the entire operation
        console.warn(`[${requestId}] ⚠️ Continuing without tags due to insertion failure`);
      }
    }

    // Return the created item in UI structure
    const decryptedItem = decryptInventoryData(item);

    // Get sizes for this item
    let decryptedSizes: Array<{
      title: string;
      quantity: number;
      onHand: number;
      price: number;
    }> = [];
    try {
      console.log(`[${requestId}] 📏 Fetching sizes for response...`);
      const itemSizes = await db
        .select()
        .from(inventorySizes)
        .where(eq(inventorySizes.itemId, item.id));

      decryptedSizes = itemSizes.map((s) => {
        const decryptedSize = decryptInventorySizeData(s);
        return {
          title: decryptedSize.title,
          quantity: decryptedSize.quantity,
          onHand: decryptedSize.onHand,
          price: decryptedSize.price,
        };
      });
      console.log(`[${requestId}] ✅ Retrieved ${decryptedSizes.length} sizes`);
    } catch (sizeFetchError) {
      console.error(`[${requestId}] ❌ Size fetch failed:`, {
        error: sizeFetchError instanceof Error ? sizeFetchError.message : String(sizeFetchError),
        itemId: item.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Get tags for this item
    let itemTags: string[] = [];
    try {
      console.log(`[${requestId}] 🏷️ Fetching tags for response...`);
      const invTags = await db
        .select()
        .from(inventoryTags)
        .where(eq(inventoryTags.itemId, item.id));

      const itemTagIds = invTags.map((t) => t.tagId);
      const allTags = itemTagIds.length
        ? await db.select().from(tags).where(inArray(tags.id, itemTagIds))
        : [];

      itemTags = allTags.map((t) => {
        const decryptedTag = decryptTagData(t);
        return decryptedTag.name;
      });
      console.log(`[${requestId}] ✅ Retrieved ${itemTags.length} tags`);
    } catch (tagFetchError) {
      console.error(`[${requestId}] ❌ Tag fetch failed:`, {
        error: tagFetchError instanceof Error ? tagFetchError.message : String(tagFetchError),
        itemId: item.id,
        timestamp: new Date().toISOString(),
      });
      // Continue with empty tags
    }

    // Sync to Typesense (async, don't wait)
    typesenseInventorySync.syncItemCreate(item.id).catch((syncError) => {
      console.error(`[${requestId}] ❌ Typesense sync failed:`, {
        error: syncError instanceof Error ? syncError.message : String(syncError),
        itemId: item.id,
        timestamp: new Date().toISOString(),
      });
    });

    const result = {
      id: item.id,
      formattedId: getFormattedId(decryptedItem.category, item.categoryCounter),
      name: decryptedItem.name,
      category: decryptedItem.category,
      imageUrl: item.imageUrl,
      tags: itemTags,
      sizes: decryptedSizes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };

    const duration = Date.now() - startTime;
    console.log(
      `[${requestId}] ✅ Inventory item creation completed successfully in ${duration}ms`,
      {
        itemId: item.id,
        formattedId: result.formattedId,
        duration,
        timestamp: new Date().toISOString(),
      }
    );

    return NextResponse.json({ success: true, item: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Inventory item creation failed after ${duration}ms:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration,
      timestamp: new Date().toISOString(),
    });

    // Check if it's a connection error
    const isConnectionError =
      error instanceof Error &&
      (error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('fetch failed') ||
        error.message.includes('other side closed'));

    if (isConnectionError) {
      return NextResponse.json(
        { error: 'Database connection issue. Please try again in a moment.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 });
  }
});
