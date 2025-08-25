import { NextResponse } from 'next/server';
import typesenseService from '@/lib/typesense';
import { db } from '@/lib/db';
import { inventoryItems, inventoryTags, tags } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { decryptTagData } from '@/lib/utils/inventoryEncryption';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || '';
    const mode = searchParams.get('mode') || 'auto'; // 'exact', 'fuzzy', 'broad', 'auto'

    console.log('Typesense search API called with:', { query, page, limit, category });

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
      sort_by: 'updatedAt:desc',
      per_page: limit,
      page: page,
      facet_by: 'category',
      filter_by: '',
      infix: 'off', // Disable infix to prevent errors
      prefix: true, // Enable prefix matching for better results
    };

    // If query has Vietnamese characters, also try normalized version
    let response: Record<string, unknown>;
    let searchTime: number;

    if (query.trim() && query !== normalizedQuery) {
      // Instead of combining, try the original query first, then fallback to normalized
      searchParameters.q = query.trim();
      console.log(`🔍 Using original Vietnamese query: "${searchParameters.q}"`);

      // If original query fails, we'll try normalized version as fallback
      const originalSearchParams = { ...searchParameters };

      // Execute search with original query
      const startTime = Date.now();
      const originalResponse = await typesenseService.search(
        'inventory_items',
        originalSearchParams
      );
      searchTime = Date.now() - startTime;

      // If original query returns no results, try normalized version
      if (
        !originalResponse.hits ||
        (originalResponse.hits as Record<string, unknown>[]).length === 0
      ) {
        console.log(
          `🔍 Original query returned no results, trying normalized: "${normalizedQuery}"`
        );
        searchParameters.q = normalizedQuery;

        // Execute search with normalized query
        const normalizedStartTime = Date.now();
        const normalizedResponse = await typesenseService.search(
          'inventory_items',
          searchParameters
        );
        searchTime = Date.now() - normalizedStartTime;

        // Use normalized results if they exist
        if (
          normalizedResponse.hits &&
          (normalizedResponse.hits as Record<string, unknown>[]).length > 0
        ) {
          console.log(
            `🔍 Normalized query found ${(normalizedResponse.hits as Record<string, unknown>[]).length} results`
          );
          response = normalizedResponse;
        } else {
          console.log(`🔍 Both original and normalized queries returned no results`);
          response = originalResponse;
        }
      } else {
        console.log(
          `🔍 Original query found ${(originalResponse.hits as Record<string, unknown>[]).length} results`
        );
        response = originalResponse;
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
        // Use very flexible search parameters for text searches to find existing patterns
        searchParameters.prefix = true;
        searchParameters.infix = 'off'; // Disable infix to prevent errors
        searchParameters.num_typos = 3; // Allow 3 typos for better matching
        searchParameters.min_score = 0.01; // Very very low minimum score to catch all matches
        searchParameters.query_by = 'name,category,tags,formattedId';
        console.log(`Very flexible text search for "${searchQuery}" to find existing patterns`);
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

    // Filter results to ensure they actually match the search query
    const searchQuery = query.trim().toLowerCase();
    const filteredItems = items.filter((item) => {
      const itemName = (item.name as string).toLowerCase();
      const itemFormattedId = (item.formattedId as string).toLowerCase();
      const itemTags = (item.tags as string[]).map((tag) => tag.toLowerCase());
      const itemCategory = (item.category as string).toLowerCase();

      // Check if the search query appears in any of the searchable fields
      const matchesName = itemName.includes(searchQuery);
      const matchesId = itemFormattedId.includes(searchQuery);
      const matchesTags = itemTags.some((tag) => tag.includes(searchQuery));
      const matchesCategory = itemCategory.includes(searchQuery);

      const matches = matchesName || matchesId || matchesTags || matchesCategory;

      if (!matches) {
        console.log(`Filtering out item ${item.id} - no match for "${searchQuery}"`);
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

    const responseData = {
      items: filteredItems, // Use filteredItems here
      total: totalHits,
      page,
      totalPages,
      hasMore: page < totalPages,
      ...performanceInfo,
      // Additional metadata for large dataset handling
      query: query || '',
      category: category || '',
      optimizedForLargeDataset: totalHits > 1000,
      facets: response.facet_counts || {},
    };

    console.log('Returning search response:', {
      itemsCount: filteredItems.length, // Log the count of filtered items
      total: totalHits,
      page,
      totalPages,
      hasMore: page < totalPages,
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
