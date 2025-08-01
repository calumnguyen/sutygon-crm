import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes, inventoryTags, tags } from '@/lib/db/schema';
import { eq, like, ilike, inArray, and, or, desc, asc, sql } from 'drizzle-orm';
import { decryptInventoryData, decryptInventorySizeData, decryptTagData } from '@/lib/utils/inventoryEncryption';
import { monitorDatabaseQuery } from '@/lib/utils/performance';

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
    
    const offset = (page - 1) * limit;

    // Get all items first since we need to decrypt to search
    const allItems = await db
      .select()
      .from(inventoryItems)
      .orderBy(desc(inventoryItems.createdAt));

    if (!allItems.length) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        totalPages: 0,
        hasMore: false
      });
    }

    // Get all sizes for these items
    const itemIds = allItems.map(item => item.id);
    const sizes = await db
      .select()
      .from(inventorySizes)
      .where(inArray(inventorySizes.itemId, itemIds));

    // Get all tags for these items
    const invTags = await db
      .select()
      .from(inventoryTags)
      .where(inArray(inventoryTags.itemId, itemIds));

    // Get tag names
    const tagIds = invTags.map(t => t.tagId);
    const allTags = tagIds.length 
      ? await db.select().from(tags).where(inArray(tags.id, tagIds))
      : [];

    // Build result with decryption and filtering
    const allResults = allItems.map(item => {
      const decryptedItem = decryptInventoryData(item);
      
      const itemSizes = sizes
        .filter(s => s.itemId === item.id)
        .map(s => {
          const decryptedSize = decryptInventorySizeData(s);
          return {
            title: decryptedSize.title,
            quantity: decryptedSize.quantity,
            onHand: decryptedSize.onHand,
            price: decryptedSize.price,
          };
        });

      const itemTagIds = invTags
        .filter(t => t.itemId === item.id)
        .map(t => t.tagId);
      
      const itemTags = allTags
        .filter(t => itemTagIds.includes(t.id))
        .map(t => {
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
      
      filteredResults = allResults.filter(item => {
        // Search by formatted ID (exact match or partial)
        const itemId = item.formattedId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const idMatch = itemId.includes(idPattern) || item.formattedId.toLowerCase().includes(searchQuery);
        
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
        const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
        const nameMatch = queryWords.every(word => normalizedName.includes(word));
        const categoryMatch = queryWords.every(word => normalizedCategory.includes(word));
        
        // Original exact matching for backward compatibility
        const exactNameMatch = item.name.toLowerCase().includes(searchQuery);
        const exactCategoryMatch = item.category.toLowerCase().includes(searchQuery);
        
        // Search by tags
        const tagMatch = item.tags.some(tag => {
          const normalizedTag = normalizeVietnamese(tag);
          return queryWords.every(word => normalizedTag.includes(word));
        });
        
        if (idMatch || nameMatch || categoryMatch || exactNameMatch || exactCategoryMatch || tagMatch) return true;
        
        return false;
      });
    }
    
    if (category) {
      filteredResults = filteredResults.filter(item => 
        item.category.toLowerCase() === category.toLowerCase()
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
      hasMore: page < totalPages
    });
  } catch (error) {
    console.error('Error in inventory search:', error);
    return NextResponse.json(
      { error: 'Failed to search inventory' },
      { status: 500 }
    );
  }
} 