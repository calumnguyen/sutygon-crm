import { NextRequest, NextResponse } from 'next/server';
import elasticsearchService from '@/lib/elasticsearch';
import { db } from '@/lib/db';
import { inventoryItems, inventoryTags, tags } from '@/lib/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { decryptTagData } from '@/lib/utils/inventoryEncryption';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';

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

export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || '';
    const mode = searchParams.get('mode') || 'auto'; // 'exact', 'fuzzy', 'broad', 'auto'

    console.log('Elasticsearch search API called with:', { query, page, limit, category });

    const offset = (page - 1) * limit;

    // Check if Elasticsearch is connected
    const isConnected = elasticsearchService.isElasticsearchConnected();
    if (!isConnected) {
      console.log('Elasticsearch not available, checking connection...');
      const connected = await elasticsearchService.connect();
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

    // Build optimized Elasticsearch query for large datasets
    const searchBody: Record<string, unknown> = {
      from: offset,
      size: limit,
      sort: [{ updatedAt: { order: 'desc' } }],
      track_total_hits: true, // Important for large datasets
    };

    // Build the query based on search parameters with enterprise-grade precision
    const must: Record<string, unknown>[] = [];
    const should: Record<string, unknown>[] = [];

    if (query.trim()) {
      const searchQuery = query.trim();
      const queryWords = searchQuery
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 0);

      console.log(
        `Building search for: "${searchQuery}" (${queryWords.length} words) in mode: ${mode}`
      );

      // ENTERPRISE STRATEGY: Tiered Search Precision Based on Mode

      // TIER 0: PRODUCT ID MATCHES (Highest Priority - Boost 25-30)
      // Handle variations like "AD000831" vs "AD-000831"
      const isLikelyProductId = /^[A-Za-z]{1,3}[-]?[0-9]{4,6}$/i.test(searchQuery);
      if (isLikelyProductId) {
        // Add exact formattedId match
        should.push({
          term: {
            formattedId: {
              value: searchQuery,
              boost: 30,
            },
          },
        });

        // Add dash variations - if query has no dash, try with dash
        if (!searchQuery.includes('-')) {
          const withDash = searchQuery.replace(/([A-Za-z]+)([0-9]+)/, '$1-$2');
          should.push({
            term: {
              formattedId: {
                value: withDash,
                boost: 28,
              },
            },
          });
        }

        // Add no-dash variations - if query has dash, try without dash
        if (searchQuery.includes('-')) {
          const withoutDash = searchQuery.replace(/-/g, '');
          should.push({
            term: {
              formattedId: {
                value: withoutDash,
                boost: 28,
              },
            },
          });
        }

        // Add wildcard search for partial ID matches
        should.push({
          wildcard: {
            formattedId: {
              value: `*${searchQuery}*`,
              boost: 25,
            },
          },
        });
      }

      // TIER 1: EXACT MATCHES (Highest Priority - Boost 20-15)
      // Perfect for product codes, exact terms, brand names
      should.push(
        {
          term: {
            'name.keyword': {
              value: searchQuery,
              boost: 20,
            },
          },
        },
        {
          term: {
            'tags.keyword': {
              value: searchQuery,
              boost: 15,
            },
          },
        },
        {
          term: {
            'category.keyword': {
              value: searchQuery,
              boost: 10,
            },
          },
        }
      );

      // TIER 2: PHRASE MATCHES (High Priority - Boost 12-8)
      // Perfect for multi-word searches like "áo dài cưới"
      if (queryWords.length > 1) {
        should.push({
          match_phrase: {
            name: {
              query: searchQuery,
              boost: 12,
            },
          },
        });
        should.push({
          match_phrase: {
            tags: {
              query: searchQuery,
              boost: 10,
            },
          },
        });
      }

      // TIER 3: CONTROLLED FUZZY SEARCH (Medium Priority - Boost 6-4)
      // Handle typos but adjust based on search mode
      let fuzziness = '0'; // Default: exact matching

      if (mode === 'exact') {
        fuzziness = '0'; // No typo tolerance
      } else if (mode === 'fuzzy') {
        fuzziness = '2'; // High typo tolerance
      } else if (mode === 'broad') {
        fuzziness = 'AUTO'; // Maximum flexibility
      } else {
        // mode === 'auto'
        fuzziness = queryWords.length === 1 && searchQuery.length <= 4 ? '0' : '1';
      }

      should.push({
        multi_match: {
          query: searchQuery,
          fields: ['name^6', 'name.search^5', 'tags^5', 'tags.search^4', 'category^3'],
          type: 'best_fields',
          fuzziness: fuzziness,
          analyzer: 'vietnamese_analyzer',
        },
      });

      // TIER 4: VIETNAMESE ACCENT NORMALIZATION (Lower Priority - Boost 3-2)
      // Only when significantly different from original
      const normalizedQuery = normalizeVietnamese(searchQuery);
      if (normalizedQuery !== searchQuery && normalizedQuery.length >= 3) {
        should.push({
          multi_match: {
            query: normalizedQuery,
            fields: ['name^3', 'tags^2', 'category^1'],
            type: 'best_fields',
            fuzziness: '0', // No fuzziness on normalized text
          },
        });
      }

      // TIER 5: PARTIAL MATCHES (Lowest Priority - Boost 2-1)
      // Adjust wildcard usage based on mode
      const shouldUseWildcard =
        mode === 'broad' ||
        (mode === 'fuzzy' && searchQuery.length >= 3) ||
        (mode === 'auto' && searchQuery.length >= 4) ||
        (mode === 'exact' && false); // No wildcards in exact mode

      if (shouldUseWildcard) {
        should.push(
          {
            wildcard: {
              'name.keyword': {
                value: `*${searchQuery}*`,
                boost: mode === 'broad' ? 3 : 2,
              },
            },
          },
          {
            wildcard: {
              'tags.keyword': {
                value: `*${searchQuery}*`,
                boost: mode === 'broad' ? 2 : 1,
              },
            },
          }
        );
      }
    }

    // Category filter
    if (category.trim()) {
      must.push({
        term: {
          'category.keyword': category.trim(),
        },
      });
    }

    // ENTERPRISE PRECISION CONTROL
    let minimumShouldMatch = 0;
    let minScore = 0.1;

    if (should.length > 0 && must.length === 0 && query.trim()) {
      const queryWords = query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 0);

      // Mode-based precision control
      if (mode === 'exact') {
        minScore = queryWords.length === 1 ? 5.0 : 3.0; // Very strict
        minimumShouldMatch = Math.max(1, Math.ceil(should.length * 0.8));
      } else if (mode === 'fuzzy') {
        minScore = 0.5; // More lenient
        minimumShouldMatch = Math.max(1, Math.ceil(should.length * 0.2));
      } else if (mode === 'broad') {
        minScore = 0.1; // Very lenient
        minimumShouldMatch = 0;
      } else {
        // mode === 'auto'
        if (queryWords.length === 1) {
          // Single word searches: Require higher relevance to avoid false positives
          minScore = query.trim().length <= 4 ? 2.0 : 1.0; // Strict for short words like "Gấm"
        } else if (queryWords.length === 2) {
          // Two word searches: Require some precision
          minimumShouldMatch = Math.max(1, Math.ceil(should.length * 0.3));
          minScore = 1.0;
        } else {
          // Multi-word searches: Require good coverage
          minimumShouldMatch = Math.max(2, Math.ceil(should.length * 0.4));
          minScore = 0.5;
        }
      }
    }

    // Build final query with enterprise precision controls
    if (must.length > 0 || should.length > 0) {
      searchBody.query = {
        bool: {
          must: must.length > 0 ? must : undefined,
          should: should.length > 0 ? should : undefined,
          minimum_should_match: minimumShouldMatch,
        },
      };

      // Apply enterprise-grade minimum score thresholds
      if (query.trim()) {
        searchBody.min_score = minScore;
        console.log(
          `Applied precision controls: min_score=${minScore}, minimum_should_match=${minimumShouldMatch}`
        );
      }
    } else {
      // No search query, return all items
      searchBody.query = {
        match_all: {},
      };
    }

    // Add optimized highlighting for search terms including tags
    if (query.trim()) {
      searchBody.highlight = {
        fields: {
          name: { number_of_fragments: 1 },
          'name.search': { number_of_fragments: 1 },
          category: { number_of_fragments: 1 },
          tags: { number_of_fragments: 3 }, // Show multiple tag matches
          'tags.search': { number_of_fragments: 3 },
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
        max_analyzed_offset: 1000000, // Support large text fields
      };
    }

    // Performance optimization for serverless
    searchBody._source = [
      'id',
      'formattedId',
      'name',
      'category',
      'tags',
      'sizes',
      'createdAt',
      'updatedAt',
    ];
    // Note: preference parameter not supported in serverless mode

    console.log('Elasticsearch query:', JSON.stringify(searchBody, null, 2));

    // Execute search
    const startTime = Date.now();
    const response = await elasticsearchService.search('inventory_items', searchBody);
    const searchTime = Date.now() - startTime;

    console.log(`Elasticsearch search completed in ${searchTime}ms`);

    // Process results
    const esResponse = response as { hits?: { hits?: unknown[]; total?: unknown } };
    const hits = esResponse.hits?.hits || [];
    const totalHits =
      typeof esResponse.hits?.total === 'object'
        ? (esResponse.hits.total as { value: number }).value
        : (esResponse.hits?.total as number) || 0;

    // Extract item IDs from search results to fetch imageUrls from database
    const itemIds = hits
      .map((hit: unknown) => {
        const hitRecord = hit as Record<string, unknown>;
        const source = hitRecord._source as Record<string, unknown>;
        return Number(source.id);
      })
      .filter((id) => !isNaN(id));

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

    const items = hits.map((hit: unknown) => {
      const hitRecord = hit as Record<string, unknown>;
      const source = hitRecord._source as Record<string, unknown>;
      const itemId = Number(source.id);

      const result: Record<string, unknown> = {
        id: source.id,
        formattedId: source.formattedId,
        name: source.name,
        category: source.category,
        imageUrl: source.imageUrl || imageUrlMap[itemId] || null, // Prefer from search index, fallback to database
        tags:
          Array.isArray(source.tags) && source.tags.length > 0
            ? source.tags
            : tagsMap[itemId] || [], // Prefer from search index, fallback to database
        sizes: source.sizes || [],
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
        _score: hitRecord._score,
      };

      // Add highlights if available with enhanced tag highlighting
      const highlights = hitRecord.highlight as Record<string, string[]> | undefined;
      if (highlights) {
        result._highlights = highlights;

        // Special handling for tag highlights
        if (highlights.tags || highlights['tags.search']) {
          result.highlightedTags = [
            ...(highlights.tags || []),
            ...(highlights['tags.search'] || []),
          ];
        }
      }

      return result;
    });

    const totalPages = Math.ceil(totalHits / limit);

    // Performance metrics for monitoring
    const performanceInfo = {
      searchTime: `${searchTime}ms`,
      elasticsearch: true,
      totalHits,
      shardInfo: (esResponse as Record<string, unknown>)?._shards || {},
      tookMs: (esResponse as Record<string, unknown>)?.took || 0,
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
    });
  } catch (error) {
    console.error('Elasticsearch search error:', error);

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
