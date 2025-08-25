import { NextRequest, NextResponse } from 'next/server';
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

    // const offset = (page - 1) * limit; // Not used in Typesense search

    // Check if Typesense is connected
    const isConnected = typesenseService.isTypesenseConnected();
    if (!isConnected) {
      console.log('Typesense not available, checking connection...');
      const connected = await typesenseService.connect();
      if (!connected) {
        return NextResponse.json(
          {
            error: 'Search service temporarily unavailable',
            fallback: true,
          },
          { status: 503 }
        );
      }
    }

    // Ensure collection exists
    await typesenseService.ensureCollectionExists('inventory_items');

    // Build Typesense search parameters
    const searchParameters: Record<string, unknown> = {
      q: query.trim() || '*',
      query_by: 'name,nameNormalized,category,categoryNormalized,tags,formattedId',
      sort_by: 'updatedAt:desc',
      per_page: limit,
      page: page,
      facet_by: 'category',
      filter_by: '',
      infix: 'off', // Disable infix for now to avoid the error
    };

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
      } else {
        // Configure fuzzy search based on mode
        if (mode === 'exact') {
          searchParameters.prefix = false;
          searchParameters.infix = 'off';
          searchParameters.num_typos = 0;
        } else if (mode === 'fuzzy') {
          searchParameters.prefix = true;
          searchParameters.infix = 'off';
          searchParameters.num_typos = 2;
        } else if (mode === 'broad') {
          searchParameters.prefix = true;
          searchParameters.infix = 'off';
          searchParameters.num_typos = 3;
        } else {
          // mode === 'auto' - improved for Vietnamese text
          searchParameters.prefix = true;
          searchParameters.infix = 'off';
          // Allow more typos for short queries to handle Vietnamese diacritics
          searchParameters.num_typos =
            searchQuery.length <= 3 ? 2 : searchQuery.length <= 5 ? 1 : 0;
        }
      }

      // Configure minimum score based on mode
      if (mode === 'exact') {
        searchParameters.min_score = 5.0;
      } else if (mode === 'fuzzy') {
        searchParameters.min_score = 0.5;
      } else if (mode === 'broad') {
        searchParameters.min_score = 0.1;
      } else {
        // mode === 'auto' - improved for Vietnamese text
        searchParameters.min_score =
          searchQuery.length <= 3 ? 0.5 : searchQuery.length <= 5 ? 1.0 : 2.0;
      }
    }

    console.log('Typesense search parameters:', JSON.stringify(searchParameters, null, 2));

    // Execute search
    const startTime = Date.now();
    const response = await typesenseService.search('inventory_items', searchParameters);
    const searchTime = Date.now() - startTime;

    console.log(`Typesense search completed in ${searchTime}ms`);

    // Process results
    const hits = response.hits || [];
    const totalHits = (response.found as number) || 0;

    // Extract item IDs from search results to fetch imageUrls from database
    const itemIds = (hits as Record<string, unknown>[])
      .map((hit: Record<string, unknown>) => (hit.document as Record<string, unknown>).id as number)
      .filter((id: number) => !isNaN(id));

    // Fetch imageUrls and tags from database
    let imageUrlMap: Record<number, string | null> = {};
    let tagsMap: Record<number, string[]> = {};

    if (itemIds.length > 0) {
      try {
        // Fetch imageUrls
        const itemsWithImages = await db
          .select({ id: inventoryItems.id, imageUrl: inventoryItems.imageUrl })
          .from(inventoryItems)
          .where(inArray(inventoryItems.id, itemIds));

        imageUrlMap = itemsWithImages.reduce(
          (acc, item) => {
            acc[item.id] = item.imageUrl;
            return acc;
          },
          {} as Record<number, string | null>
        );

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

      const result: Record<string, unknown> = {
        id: document.id as number,
        formattedId: document.formattedId as string,
        name: document.name as string,
        category: document.category as string,
        imageUrl: (document.imageUrl as string) || imageUrlMap[itemId] || null,
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

      return result;
    });

    const totalPages = Math.ceil(totalHits / limit);

    // Performance metrics for monitoring
    const performanceInfo = {
      searchTime: `${searchTime}ms`,
      typesense: true,
      totalHits,
      searchCutoff: response.search_cutoff || false,
      tookMs: response.search_time_ms || 0,
    };

    return NextResponse.json({
      items,
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
    });
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
