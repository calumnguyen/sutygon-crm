import { NextRequest, NextResponse } from 'next/server';
import elasticsearchService from '@/lib/elasticsearch';

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

    // Build the query based on search parameters
    const must: Record<string, unknown>[] = [];
    const should: Record<string, unknown>[] = [];

    // Handle search query with precise matching
    if (query.trim()) {
      const searchQuery = query.trim();
      const queryWords = searchQuery
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 0);

      // Strategy 1: Exact phrase matches (highest priority)
      should.push(
        {
          multi_match: {
            query: searchQuery,
            fields: ['name.keyword^20', 'tags.keyword^15', 'category.keyword^10'],
            type: 'phrase',
          },
        },
        {
          multi_match: {
            query: searchQuery,
            fields: ['name^15', 'tags^10', 'category^8'],
            type: 'phrase_prefix',
          },
        }
      );

      // Strategy 2: All words must appear (for multi-word searches)
      if (queryWords.length > 1) {
        const wordQueries = queryWords.map((word) => ({
          multi_match: {
            query: word,
            fields: ['name^8', 'tags^6', 'category^4'],
            type: 'best_fields',
            fuzziness: '1', // Only 1 character difference allowed
            minimum_should_match: '1',
          },
        }));

        should.push({
          bool: {
            must: wordQueries,
            boost: 10,
          },
        });
      }

      // Strategy 3: Single word or looser matching (lower priority)
      should.push({
        multi_match: {
          query: searchQuery,
          fields: ['name^6', 'name.search^5', 'tags^5', 'tags.search^4', 'category^3'],
          type: 'best_fields',
          fuzziness: '1', // Reduced from AUTO to be more strict
          analyzer: 'vietnamese_analyzer',
        },
      });

      // Strategy 4: Normalized Vietnamese search (for accent variations)
      const normalizedQuery = normalizeVietnamese(searchQuery);
      if (normalizedQuery !== searchQuery) {
        should.push({
          multi_match: {
            query: normalizedQuery,
            fields: ['name^4', 'tags^3', 'category^2'],
            type: 'best_fields',
            fuzziness: '1',
          },
        });
      }

      // Only use wildcard for single words or very short queries
      if (queryWords.length === 1 && searchQuery.length >= 3) {
        should.push(
          {
            wildcard: {
              'name.keyword': {
                value: `*${searchQuery}*`,
                boost: 2,
              },
            },
          },
          {
            wildcard: {
              'tags.keyword': {
                value: `*${searchQuery}*`,
                boost: 2,
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

    // Build final query with better relevance scoring
    if (must.length > 0 || should.length > 0) {
      let minimumShouldMatch = 0;

      // For search queries, require more precise matching
      if (should.length > 0 && must.length === 0 && query.trim()) {
        const queryWords = query
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 0);
        if (queryWords.length > 1) {
          // For multi-word searches, require higher matching threshold
          if (queryWords.length >= 3) {
            // For 3+ word searches, require at least 3 should clauses
            minimumShouldMatch = Math.max(3, Math.ceil(should.length * 0.6));
          } else {
            // For 2 word searches, require at least 2 should clauses
            minimumShouldMatch = Math.max(2, Math.ceil(should.length * 0.5));
          }
        } else {
          // For single word searches, at least 1 good match
          minimumShouldMatch = 1;
        }
      }

      searchBody.query = {
        bool: {
          must: must.length > 0 ? must : undefined,
          should: should.length > 0 ? should : undefined,
          minimum_should_match: minimumShouldMatch,
        },
      };

      // Add minimum score threshold for search queries to filter out irrelevant results
      if (query.trim()) {
        const queryWords = query
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 0);
        if (queryWords.length > 1) {
          searchBody.min_score = 1.0; // Higher threshold for multi-word searches
        } else {
          searchBody.min_score = 0.5; // Standard threshold for single words
        }
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

    const items = hits.map((hit: unknown) => {
      const hitRecord = hit as Record<string, unknown>;
      const source = hitRecord._source as Record<string, unknown>;
      const result: Record<string, unknown> = {
        id: source.id,
        formattedId: source.formattedId,
        name: source.name,
        category: source.category,
        imageUrl: null, // Not stored in search index
        tags: Array.isArray(source.tags) ? source.tags : [], // Ensure tags is always an array
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
}
