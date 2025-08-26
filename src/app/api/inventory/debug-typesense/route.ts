import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/utils/authMiddleware';
import { typesenseService } from '@/lib/typesense';

export const GET = withAuth(async () => {
  try {
    // Connect to Typesense
    await typesenseService.connect();

    // Search for a few documents to see their structure
    const searchParameters = {
      q: '*',
      per_page: 10,
      page: 1,
    };

    const searchResponse = await typesenseService.search('inventory_items', searchParameters);
    const hits = (searchResponse.hits as Record<string, unknown>[]) || [];

    // Extract imageUrl values from the first few documents
    const imageUrlValues = hits.map((hit: Record<string, unknown>) => ({
      id: (hit.document as Record<string, unknown>).id,
      imageUrl: (hit.document as Record<string, unknown>).imageUrl,
      category: (hit.document as Record<string, unknown>).category,
      name: (hit.document as Record<string, unknown>).name,
    }));

    return NextResponse.json({
      total: searchResponse.found,
      sampleDocuments: imageUrlValues,
      uniqueImageUrlValues: [
        ...new Set(
          hits.map(
            (hit: Record<string, unknown>) => (hit.document as Record<string, unknown>).imageUrl
          )
        ),
      ],
    });
  } catch (error) {
    console.error('Debug Typesense error:', error);
    return NextResponse.json({ error: 'Failed to debug Typesense' }, { status: 500 });
  }
});
