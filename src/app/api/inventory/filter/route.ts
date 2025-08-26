import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/authMiddleware';
import { AuthenticatedRequest } from '@/lib/utils/authMiddleware';
import { typesenseService } from '@/lib/typesense';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes, inventoryTags, tags } from '@/lib/db/schema';
import { inArray, and, sql, asc } from 'drizzle-orm';
import {
  decryptInventoryData,
  decryptInventorySizeData,
  decryptTagData,
  encryptInventoryData,
} from '@/lib/utils/inventoryEncryption';

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
  const categories = searchParams.getAll('category'); // Get all category parameters
  const hasImage = searchParams.get('hasImage'); // Get hasImage parameter
  const sortBy = searchParams.get('sortBy'); // Get sortBy parameter
  console.log(
    '📥 Filter endpoint received categories:',
    categories,
    'hasImage:',
    hasImage,
    'sortBy:',
    sortBy
  );

  // Allow filtering by either categories or hasImage, OR allow sorting by oldest to get all items
  if (categories.length === 0 && !hasImage && sortBy !== 'oldest') {
    return NextResponse.json(
      { error: 'Either category or hasImage parameter is required' },
      { status: 400 }
    );
  }

  try {
    let items: (typeof inventoryItems.$inferSelect)[] = [];
    let total = 0;
    let useTypesenseOrder = false;

    // Always use direct database queries when sorting by oldest to ensure proper chronological order
    if (sortBy === 'oldest') {
      console.log('🔄 Using direct database query for oldest sorting to get ALL items');

      // Build database query conditions
      const whereConditions: Array<ReturnType<typeof sql> | ReturnType<typeof inArray>> = [];

      // Add category filter if categories are provided
      if (categories.length > 0) {
        // Encrypt categories for database lookup
        const encryptedCategories = categories.map((cat) => {
          const encrypted = encryptInventoryData({ name: '', category: cat });
          return encrypted.category;
        });
        whereConditions.push(inArray(inventoryItems.category, encryptedCategories));
      }

      // Add hasImage filter if provided
      if (hasImage) {
        if (hasImage === 'with_image') {
          whereConditions.push(sql`${inventoryItems.imageUrl} IS NOT NULL`);
        } else if (hasImage === 'without_image') {
          whereConditions.push(sql`${inventoryItems.imageUrl} IS NULL`);
        }
      }

      // Get ALL items matching the filter conditions, ordered by createdAt ascending for oldest sorting
      if (whereConditions.length > 0) {
        items = await db
          .select()
          .from(inventoryItems)
          .where(and(...whereConditions))
          .orderBy(asc(inventoryItems.createdAt));
      } else {
        items = await db.select().from(inventoryItems).orderBy(asc(inventoryItems.createdAt));
      }
      total = items.length;
      useTypesenseOrder = false;

      console.log('🔍 Database query results for oldest sorting:', {
        total,
        categories,
        hasImage,
        sortBy,
        firstItem:
          items.length > 0
            ? {
                id: items[0].id,
                categoryCounter: items[0].categoryCounter,
                createdAt: items[0].createdAt,
              }
            : null,
        lastItem:
          items.length > 0
            ? {
                id: items[items.length - 1].id,
                categoryCounter: items[items.length - 1].categoryCounter,
                createdAt: items[items.length - 1].createdAt,
              }
            : null,
      });

      // Debug: Log first few items to verify sorting
      if (items.length > 0) {
        console.log(
          '🔍 First 3 items from database query:',
          items.slice(0, 3).map((item) => ({
            id: item.id,
            createdAt: item.createdAt,
            categoryCounter: item.categoryCounter,
          }))
        );
      }
    } else {
      // Use Typesense for other sorting options (newest first, default)
      console.log('🔄 Using Typesense for sorting:', sortBy);

      // Connect to Typesense
      await typesenseService.connect();

      // Build Typesense filter
      const filterConditions: string[] = [];

      // Add category filter if categories are provided
      if (categories.length > 0) {
        const categoryFilter = categories.map((cat) => `category:=${cat}`).join(' || ');
        filterConditions.push(`(${categoryFilter})`);
      }

      // Add hasImage filter if provided
      if (hasImage) {
        if (hasImage === 'with_image') {
          filterConditions.push('imageUrl:=has_image');
        } else if (hasImage === 'without_image') {
          // For items without images, filter by absence of has_image value
          // This handles both null values and items that don't have the imageUrl field set
          filterConditions.push('imageUrl:!=has_image');
        }
      }

      const filterBy = filterConditions.join(' && ');

      // For Typesense, we'll get all filtered results and then sort them properly
      const searchParameters = {
        q: '*', // Search all documents
        filter_by: filterBy, // Filter by categories and/or hasImage
        sort_by: 'updatedAt:desc', // Default sort for Typesense
        per_page: 250, // Typesense limit
        page: 1, // Always get first page from Typesense
      };

      console.log('🔍 Typesense search parameters:', {
        filterBy,
        hasImage,
        categories,
        searchParameters,
      });

      const searchResponse = await typesenseService.search('inventory_items', searchParameters);

      // Get the IDs from Typesense results
      const hits = (searchResponse.hits as Record<string, unknown>[]) || [];
      const itemIds = hits.map((hit: Record<string, unknown>) =>
        parseInt((hit.document as Record<string, unknown>).id as string)
      );
      total = (searchResponse.found as number) || 0;

      console.log('🔍 Typesense search response:', {
        total,
        hitsCount: hits.length,
        firstHit:
          hits.length > 0
            ? {
                id: (hits[0].document as Record<string, unknown>).id,
                imageUrl: (hits[0].document as Record<string, unknown>).imageUrl,
                category: (hits[0].document as Record<string, unknown>).category,
              }
            : null,
        sampleHits: hits.slice(0, 3).map((hit) => ({
          id: (hit.document as Record<string, unknown>).id,
          imageUrl: (hit.document as Record<string, unknown>).imageUrl,
          category: (hit.document as Record<string, unknown>).category,
        })),
      });

      if (itemIds.length === 0) {
        return NextResponse.json({
          items: [],
          hasMore: false,
          total: 0,
          page,
          limit,
          offset,
        });
      }

      // Fetch complete data from database using the filtered IDs
      items = await db.select().from(inventoryItems).where(inArray(inventoryItems.id, itemIds));

      // Store the Typesense order for later use
      useTypesenseOrder = true;
      (
        items as (typeof inventoryItems.$inferSelect)[] & { typesenseOrder?: number[] }
      ).typesenseOrder = itemIds;
    }

    // Sort items based on the sortBy parameter
    let sortedItems: (typeof inventoryItems.$inferSelect)[];
    if (sortBy === 'oldest') {
      // Sort by createdAt ascending (oldest first) for proper chronological order
      sortedItems = items.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      console.log(
        '🔄 Sorted by oldest - first item:',
        sortedItems.length > 0
          ? {
              id: sortedItems[0].id,
              categoryCounter: sortedItems[0].categoryCounter,
              createdAt: sortedItems[0].createdAt,
            }
          : null
      );
    } else if (sortBy === 'newest') {
      // Sort by createdAt descending (newest first)
      sortedItems = items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      // Default: maintain Typesense order (newest first by updatedAt)
      if (
        useTypesenseOrder &&
        (items as (typeof inventoryItems.$inferSelect)[] & { typesenseOrder?: number[] })
          .typesenseOrder
      ) {
        // For Typesense results, maintain the order from Typesense
        const itemMap = new Map(items.map((item) => [item.id, item]));
        const typesenseOrder = (
          items as (typeof inventoryItems.$inferSelect)[] & { typesenseOrder?: number[] }
        ).typesenseOrder!;
        sortedItems = typesenseOrder
          .map((id: number) => itemMap.get(id))
          .filter(Boolean) as (typeof inventoryItems.$inferSelect)[];
      } else {
        // For database results, use default order
        sortedItems = items;
      }
    }

    if (!sortedItems.length) {
      return NextResponse.json({
        items: [],
        hasMore: false,
        total: 0,
        page,
        limit,
        offset,
      });
    }

    // Get all sizes for these items in a single query
    const sizes = await db
      .select()
      .from(inventorySizes)
      .where(
        inArray(
          inventorySizes.itemId,
          sortedItems.map((i) => i.id)
        )
      );

    // Get all inventory_tags for these items in a single query
    const invTags = await db
      .select()
      .from(inventoryTags)
      .where(
        inArray(
          inventoryTags.itemId,
          sortedItems.map((i) => i.id)
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

    // Process items with decryption and include images
    const processedItems = sortedItems
      .filter((item) => item !== undefined)
      .map((item) => {
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

        const formattedId = getFormattedId(decryptedItem.category, item.categoryCounter);
        return {
          id: item.id,
          formattedId: formattedId,
          name: decryptedItem.name,
          category: decryptedItem.category,
          imageUrl: item.imageUrl, // Now includes the actual image data
          tags: itemTags,
          sizes: decryptedSizes,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });

    // Apply pagination to the processed results
    const startIndex = offset;
    const endIndex = startIndex + limit;
    const paginatedItems = processedItems.slice(startIndex, endIndex);

    // Debug: Log first few items to see formatted IDs
    if (sortBy === 'oldest' && paginatedItems.length > 0) {
      console.log(
        '🔍 First few items after sorting by oldest:',
        paginatedItems.slice(0, 3).map((item) => ({
          id: item.id,
          formattedId: item.formattedId,
          category: item.category,
          createdAt: item.createdAt,
        }))
      );
    }

    // Calculate hasMore based on the total number of items and current pagination
    const hasMore = endIndex < processedItems.length;

    return NextResponse.json({
      items: paginatedItems,
      hasMore,
      total: processedItems.length, // Use the actual count of processed items
      page,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to filter inventory by category:', error);

    // Check if it's a connection error
    if (
      error instanceof Error &&
      (error.message.includes('connection') ||
        error.message.includes('timeout') ||
        error.message.includes('fetch failed') ||
        error.message.includes('other side closed'))
    ) {
      return NextResponse.json(
        { error: 'Search service connection issue. Please try again in a moment.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to filter inventory items' }, { status: 500 });
  }
});
