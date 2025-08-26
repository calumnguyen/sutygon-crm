import { NextResponse } from 'next/server';
import typesenseService from '@/lib/typesense';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes, inventoryTags, tags } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { decryptTagData } from '@/lib/utils/inventoryEncryption';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';

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
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || '';
    const mode = searchParams.get('mode') || 'auto'; // 'exact', 'fuzzy', 'broad', 'auto'
    const sortBy = searchParams.get('sortBy'); // Get sortBy parameter

    console.log('Typesense search API called with:', { query, page, limit, category, sortBy });

    // Normalize Vietnamese text for better search
    function normalizeVietnamese(text: string): string {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
    }

    const normalizedQuery = normalizeVietnamese(query);
    console.log(`🔍 Original query: "${query}"`);
    console.log(`🔍 Normalized query: "${normalizedQuery}"`);

    // If sorting by oldest, use direct database queries for proper chronological order
    if (sortBy === 'oldest' && query.trim()) {
      console.log('🔄 Using direct database query for oldest sorting in search');

      try {
        // Import necessary functions for database queries
        const {
          decryptInventoryData,
          decryptInventorySizeData,
          decryptTagData,
          encryptInventoryData,
        } = await import('@/lib/utils/inventoryEncryption');
        const { inArray, sql } = await import('drizzle-orm');

        // Build database query conditions
        const whereConditions: Array<ReturnType<typeof sql>> = [];

        // Add category filter if provided
        if (category) {
          const encryptedCategory = encryptInventoryData({ name: '', category }).category;
          whereConditions.push(sql`${inventoryItems.category} = ${encryptedCategory}`);
        }

        // Get ALL items matching the search criteria
        const items = await db.select().from(inventoryItems);

        // Filter items by search query (client-side filtering for oldest sorting)
        const searchQuery = query.trim().toLowerCase();
        const normalizedSearchQuery = normalizeVietnamese(searchQuery);

        // Decrypt and filter items
        const filteredItems = [];
        for (const item of items) {
          const decryptedItem = decryptInventoryData(item);

          // Check if item matches search query
          const itemName = decryptedItem.name.toLowerCase();
          const itemCategory = decryptedItem.category.toLowerCase();
          const normalizedItemName = normalizeVietnamese(itemName);
          const normalizedItemCategory = normalizeVietnamese(itemCategory);

          // Check various search criteria
          const matchesName =
            itemName.includes(searchQuery) || normalizedItemName.includes(normalizedSearchQuery);
          const matchesCategory =
            itemCategory.includes(searchQuery) ||
            normalizedItemCategory.includes(normalizedSearchQuery);
          const matchesId = item.id.toString().includes(searchQuery);

          // Check formatted ID
          const formattedId = getFormattedId(decryptedItem.category, item.categoryCounter);
          const matchesFormattedId = formattedId.toLowerCase().includes(searchQuery);

          if (matchesName || matchesCategory || matchesId || matchesFormattedId) {
            filteredItems.push(item);
          }
        }

        // Sort by createdAt ascending (oldest first)
        filteredItems.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        console.log('🔍 Database search results for oldest sorting:', {
          total: filteredItems.length,
          query: searchQuery,
          sortBy,
        });

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedItems = filteredItems.slice(startIndex, endIndex);

        // Process items with decryption
        const processedItems = await Promise.all(
          paginatedItems.map(async (item) => {
            const decryptedItem = decryptInventoryData(item);

            // Get sizes for this item
            const sizes = await db
              .select()
              .from(inventorySizes)
              .where(sql`item_id = ${item.id}`);
            const decryptedSizes = sizes.map((size) => {
              const decryptedSize = decryptInventorySizeData(size);
              return {
                title: decryptedSize.title,
                quantity: decryptedSize.quantity,
                onHand: decryptedSize.onHand,
                price: decryptedSize.price,
              };
            });

            // Get tags for this item
            const invTags = await db
              .select()
              .from(inventoryTags)
              .where(sql`item_id = ${item.id}`);
            const tagIds = invTags.map((t) => t.tagId);
            const allTags = tagIds.length
              ? await db.select().from(tags).where(inArray(tags.id, tagIds))
              : [];
            const itemTags = allTags.map((t) => {
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
              sizes: decryptedSizes,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
          })
        );

        return NextResponse.json({
          items: processedItems,
          total: filteredItems.length,
          page,
          totalPages: Math.ceil(filteredItems.length / limit),
          hasMore: endIndex < filteredItems.length,
          typesense: false,
          database: true,
        });
      } catch (error) {
        console.error('Database search error:', error);
        // Fall back to Typesense search
      }
    }

    // const offset = (page - 1) * limit; // Not used in Typesense search

    // Check if Typesense is connected
    const isConnected = typesenseService.isTypesenseConnected();
    if (!isConnected) {
      console.log('Typesense not available, checking connection...');
      const connected = await typesenseService.connect();
      if (!connected) {
        console.log('Typesense connection failed, redirecting to fallback search...');
        // Redirect to fallback search API
        const fallbackUrl = new URL('/api/inventory/search', request.url);
        fallbackUrl.searchParams.set('q', query);
        fallbackUrl.searchParams.set('page', page.toString());
        fallbackUrl.searchParams.set('limit', limit.toString());
        if (category) fallbackUrl.searchParams.set('category', category);

        const fallbackResponse = await fetch(fallbackUrl.toString(), {
          headers: {
            Authorization: request.headers.get('authorization') || '',
          },
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          return NextResponse.json({
            ...fallbackData,
            fallback: true,
            typesense: false,
          });
        } else {
          return NextResponse.json(
            {
              error: 'Search service temporarily unavailable',
              fallback: true,
            },
            { status: 503 }
          );
        }
      }
    }

    // Ensure collection exists
    await typesenseService.ensureCollectionExists('inventory_items');

    // Build Typesense search parameters
    const searchParameters: Record<string, unknown> = {
      q: query.trim() || '*',
      query_by: 'name,category,tags,formattedId',
      sort_by: sortBy === 'oldest' ? 'createdAt:asc' : 'updatedAt:desc', // Use createdAt for oldest sorting
      per_page: limit,
      page: page,
      facet_by: 'category',
      filter_by: '',
      infix: 'off', // Disable infix to prevent errors
      prefix: true, // Enable prefix matching for better results
    };

    // Enhanced Vietnamese text search with multiple strategies
    let response: Record<string, unknown>;
    let searchTime: number;

    if (query.trim() && query !== normalizedQuery) {
      console.log(`🔍 Vietnamese text detected, using enhanced search strategy`);

      // Strategy 1: Try original Vietnamese query
      searchParameters.q = query.trim();
      console.log(`🔍 Strategy 1: Original Vietnamese query: "${searchParameters.q}"`);

      const startTime = Date.now();
      const originalResponse = await typesenseService.search('inventory_items', searchParameters);
      searchTime = Date.now() - startTime;

      const originalHits = (originalResponse.hits as Record<string, unknown>[]) || [];
      console.log(`🔍 Strategy 1 results: ${originalHits.length} hits`);

      // Strategy 2: Try normalized query (without diacritics)
      searchParameters.q = normalizedQuery;
      console.log(`🔍 Strategy 2: Normalized query: "${searchParameters.q}"`);

      const normalizedResponse = await typesenseService.search('inventory_items', searchParameters);
      const normalizedHits = (normalizedResponse.hits as Record<string, unknown>[]) || [];
      console.log(`🔍 Strategy 2 results: ${normalizedHits.length} hits`);

      // Strategy 3: Try partial word matching for Vietnamese
      const words = query.trim().split(/\s+/);
      if (words.length > 1) {
        // Try searching with just the first word
        searchParameters.q = words[0];
        console.log(`🔍 Strategy 3: First word only: "${searchParameters.q}"`);

        const partialResponse = await typesenseService.search('inventory_items', searchParameters);
        const partialHits = (partialResponse.hits as Record<string, unknown>[]) || [];
        console.log(`🔍 Strategy 3 results: ${partialHits.length} hits`);

        // Combine all results and deduplicate by ID
        const allHits = [...originalHits, ...normalizedHits, ...partialHits];
        const uniqueHits = allHits.filter(
          (hit, index, self) =>
            index ===
            self.findIndex(
              (h) =>
                (h.document as Record<string, unknown>).id ===
                (hit.document as Record<string, unknown>).id
            )
        );

        console.log(`🔍 Combined unique results: ${uniqueHits.length} hits`);

        // Use the response with the most hits, or combine them
        if (uniqueHits.length > originalHits.length) {
          response = {
            ...originalResponse,
            hits: uniqueHits,
            found: uniqueHits.length,
          };
        } else {
          response = originalResponse;
        }
      } else {
        // Single word, use the best result
        if (normalizedHits.length > originalHits.length) {
          response = normalizedResponse;
        } else {
          response = originalResponse;
        }
      }
    } else {
      // No Vietnamese characters, proceed with normal search
      console.log(`🔍 Using standard query: "${searchParameters.q}"`);

      // Execute search
      const startTime = Date.now();
      response = await typesenseService.search('inventory_items', searchParameters);
      searchTime = Date.now() - startTime;
    }

    console.log(`🔍 Typesense search completed in ${searchTime}ms`);
    console.log(
      `🔍 Search results: ${(response.hits as Record<string, unknown>[])?.length || 0} items found`
    );

    console.log(`🔍 Typesense search parameters:`, {
      query: query.trim(),
      query_by: searchParameters.query_by,
      min_score: searchParameters.min_score,
      num_typos: searchParameters.num_typos,
    });

    // Handle category filtering
    if (category.trim()) {
      searchParameters.filter_by = `category:=${category.trim()}`;
    }

    // Configure search behavior based on mode
    if (query.trim()) {
      const searchQuery = query.trim();

      // Handle product ID searches
      const isLikelyProductId = /^[A-Za-z]{1,3}[-]?[0-9]{4,6}$/i.test(searchQuery);
      if (isLikelyProductId) {
        searchParameters.query_by = 'formattedId,name,category,tags';
        searchParameters.prefix = false;
        searchParameters.infix = 'off';
        searchParameters.num_typos = 0; // No typos for product IDs
        searchParameters.min_score = 2.0; // Higher minimum score for product IDs
        console.log(`Product ID search detected for "${searchQuery}"`);
      } else {
        // Use very flexible search parameters for Vietnamese text searches
        searchParameters.prefix = true;
        searchParameters.infix = 'off'; // Disable infix to prevent errors
        searchParameters.num_typos = 2; // Allow 2 typos for Vietnamese text
        searchParameters.min_score = 0.001; // Very low minimum score for Vietnamese text
        searchParameters.query_by = 'name,category,tags,formattedId';

        // For Vietnamese text, also try without diacritics
        if (query !== normalizedQuery) {
          console.log(
            `Vietnamese text search: "${searchQuery}" (will also try normalized: "${normalizedQuery}")`
          );
        } else {
          console.log(`Standard text search for "${searchQuery}"`);
        }
      }
    }

    console.log('Typesense search parameters:', JSON.stringify(searchParameters, null, 2));
    console.log(`Search query: "${query}", mode: ${mode}, length: ${query.trim().length}`);

    // Debug: Log first few results to see what's being returned
    if (response.hits && (response.hits as Record<string, unknown>[]).length > 0) {
      console.log(
        `🔍 First 3 results:`,
        (response.hits as Record<string, unknown>[])
          .slice(0, 3)
          .map((hit: Record<string, unknown>) => ({
            id: (hit.document as Record<string, unknown>).id,
            name: (hit.document as Record<string, unknown>).name,
            category: (hit.document as Record<string, unknown>).category,
            score: hit.text_match,
            patterns: (hit.document as Record<string, unknown>).patterns,
          }))
      );
    }

    // Process results
    const hits = (response.hits as Record<string, unknown>[]) || [];
    const totalHits = (response.found as number) || 0;

    console.log(`Search results: ${hits.length} hits out of ${totalHits} total`);
    if (hits.length > 0) {
      console.log('First hit:', hits[0]);
    }

    // Extract item IDs from search results to fetch imageUrls from database
    const itemIds = hits
      .map((hit: Record<string, unknown>) => (hit.document as Record<string, unknown>).id as number)
      .filter((id: number) => !isNaN(id));

    console.log(`Extracted ${itemIds.length} item IDs for image/tag fetching`);

    // Fetch imageUrls and tags from database
    let imageUrlMap: Record<number, string | null> = {};
    let tagsMap: Record<number, string[]> = {};

    if (itemIds.length > 0) {
      try {
        // Fetch imageUrls - simplified logic
        const itemsWithImages = await db
          .select({ id: inventoryItems.id, imageUrl: inventoryItems.imageUrl })
          .from(inventoryItems)
          .where(inArray(inventoryItems.id, itemIds));

        imageUrlMap = itemsWithImages.reduce(
          (acc, item) => {
            // Use the imageUrl directly from database
            acc[item.id] = item.imageUrl;
            return acc;
          },
          {} as Record<number, string | null>
        );

        // Debug: Log what we found
        console.log('ImageUrlMap debug:', {
          itemIds: itemIds,
          imageUrlMapKeys: Object.keys(imageUrlMap),
          sampleImageUrl: imageUrlMap[itemIds[0]],
        });

        // Fetch tags for all items
        const itemsWithTags = await db
          .select({
            itemId: inventoryTags.itemId,
            tagName: tags.name,
          })
          .from(inventoryTags)
          .innerJoin(tags, eq(inventoryTags.tagId, tags.id))
          .where(inArray(inventoryTags.itemId, itemIds));

        // Group tags by item ID and decrypt them
        tagsMap = itemsWithTags.reduce(
          (acc, item) => {
            const decryptedTagName = decryptTagData({ name: item.tagName }).name;
            if (!acc[item.itemId]) {
              acc[item.itemId] = [];
            }
            acc[item.itemId].push(decryptedTagName);
            return acc;
          },
          {} as Record<number, string[]>
        );
      } catch (dbError) {
        console.error('Failed to fetch imageUrls and tags from database:', dbError);
        // Continue without images/tags rather than failing the entire search
      }
    }

    const items = (hits as Record<string, unknown>[]).map((hit: Record<string, unknown>) => {
      const document = hit.document as Record<string, unknown>;
      const itemId = document.id as number;

      // Simplified image URL resolution - prioritize database over Typesense
      const dbImageUrl = imageUrlMap[itemId];
      const typesenseImageUrl = document.imageUrl as string;

      // Use database image URL if available, otherwise use Typesense reference
      const finalImageUrl =
        dbImageUrl || (typesenseImageUrl === 'has_image' ? null : typesenseImageUrl);

      console.log(`Item ${itemId} imageUrl resolution:`, {
        typesenseImageUrl,
        dbImageUrl: dbImageUrl ? 'EXISTS' : 'NULL',
        finalImageUrl: finalImageUrl ? 'EXISTS' : 'NULL',
      });

      const result: Record<string, unknown> = {
        id: document.id as number,
        formattedId: document.formattedId as string,
        name: document.name as string,
        category: document.category as string,
        imageUrl: finalImageUrl,
        tags:
          Array.isArray(document.tags) && (document.tags as unknown[]).length > 0
            ? (document.tags as string[])
            : tagsMap[itemId] || [],
        sizes: (document.sizes as unknown[]) || [],
        createdAt: document.createdAt as string,
        updatedAt: document.updatedAt as string,
        _score: (hit.text_match as number) || 0,
      };

      // Add highlights if available
      if (hit.highlights) {
        result._highlights = hit.highlights;
      }

      // Debug: Log each item being returned
      console.log(`Returning item for search "${query}":`, {
        id: result.id,
        formattedId: result.formattedId,
        name: result.name,
        tags: result.tags,
        score: result._score,
        highlights: result._highlights,
      });

      return result;
    });

    // More lenient filtering for Vietnamese text search
    const searchQuery = query.trim().toLowerCase();
    const normalizedSearchQuery = normalizeVietnamese(searchQuery);

    console.log(
      `🔍 Filtering with query: "${searchQuery}" (normalized: "${normalizedSearchQuery}")`
    );
    console.log(`🔍 Total items before filtering: ${items.length}`);

    // Split search query into individual words for more flexible matching
    const searchWords = searchQuery.split(/\s+/).filter((word) => word.length > 0);
    const normalizedSearchWords = normalizedSearchQuery
      .split(/\s+/)
      .filter((word) => word.length > 0);

    console.log(`🔍 Search words: ${JSON.stringify(searchWords)}`);
    console.log(`🔍 Normalized search words: ${JSON.stringify(normalizedSearchWords)}`);

    const filteredItems = items.filter((item) => {
      const itemName = (item.name as string).toLowerCase();
      const itemFormattedId = (item.formattedId as string).toLowerCase();
      const itemTags = (item.tags as string[]).map((tag) => tag.toLowerCase());
      const itemCategory = (item.category as string).toLowerCase();

      // Also check normalized versions for Vietnamese text
      const normalizedItemName = normalizeVietnamese(itemName);
      const normalizedItemCategory = normalizeVietnamese(itemCategory);
      const normalizedItemTags = itemTags.map((tag) => normalizeVietnamese(tag));

      // More flexible matching: check if ANY word from the search query appears in ANY field
      let matches = false;
      let matchReason = '';

      for (const word of searchWords) {
        if (itemName.includes(word)) {
          matches = true;
          matchReason = `name contains "${word}"`;
          break;
        }
        if (itemFormattedId.includes(word)) {
          matches = true;
          matchReason = `ID contains "${word}"`;
          break;
        }
        if (itemTags.some((tag) => tag.includes(word))) {
          matches = true;
          matchReason = `tags contain "${word}"`;
          break;
        }
        if (itemCategory.includes(word)) {
          matches = true;
          matchReason = `category contains "${word}"`;
          break;
        }
      }

      // If no match with original words, try normalized words
      if (!matches) {
        for (const normalizedWord of normalizedSearchWords) {
          if (normalizedItemName.includes(normalizedWord)) {
            matches = true;
            matchReason = `normalized name contains "${normalizedWord}"`;
            break;
          }
          if (normalizedItemTags.some((tag) => tag.includes(normalizedWord))) {
            matches = true;
            matchReason = `normalized tags contain "${normalizedWord}"`;
            break;
          }
          if (normalizedItemCategory.includes(normalizedWord)) {
            matches = true;
            matchReason = `normalized category contains "${normalizedWord}"`;
            break;
          }
        }
      }

      if (!matches) {
        console.log(`🔍 Filtering out item ${item.id} - no match for "${searchQuery}"`, {
          itemName: itemName.substring(0, 50),
          normalizedItemName: normalizedItemName.substring(0, 50),
          itemTags: itemTags.slice(0, 3),
          normalizedItemTags: normalizedItemTags.slice(0, 3),
          itemCategory,
          normalizedItemCategory,
        });
      } else {
        console.log(`✅ Item ${item.id} matches "${searchQuery}" (${matchReason})`);
      }

      return matches;
    });

    console.log(
      `Filtered ${items.length} items down to ${filteredItems.length} matching items for "${searchQuery}"`
    );

    const totalPages = Math.ceil(totalHits / limit);

    // Performance metrics for monitoring
    const performanceInfo = {
      searchTime: `${searchTime}ms`,
      typesense: true,
      totalHits,
      searchCutoff: response.search_cutoff || false,
      tookMs: response.search_time_ms || 0,
    };

    // For debugging: temporarily disable filtering to see all results
    const debugMode = searchParams.get('debug') === 'true';
    const finalItems = debugMode ? items : filteredItems;

    console.log(
      `🔍 Debug mode: ${debugMode}, using ${finalItems.length} items (filtered: ${filteredItems.length}, original: ${items.length})`
    );

    const responseData = {
      items: finalItems, // Use finalItems (either filtered or all)
      total: totalHits, // Keep original total for now
      page,
      totalPages,
      hasMore: page < totalPages,
      ...performanceInfo,
      // Additional metadata for large dataset handling
      query: query || '',
      category: category || '',
      optimizedForLargeDataset: totalHits > 1000,
      facets: response.facet_counts || {},
      // Include filtered count for debugging
      filteredCount: filteredItems.length,
      debugMode: debugMode,
    };

    console.log('Returning search response:', {
      itemsCount: finalItems.length, // Log the count of final items
      total: totalHits,
      filteredCount: filteredItems.length,
      originalCount: items.length,
      debugMode: debugMode,
      page,
      totalPages,
      hasMore: page < totalPages,
      searchQuery: query.trim(),
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Typesense search error:', error);

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        fallback: true,
      },
      { status: 500 }
    );
  }
});
