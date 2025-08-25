import { db } from '../src/lib/db';
import { inventoryItems, inventorySizes, inventoryTags, tags } from '../src/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { decryptTagData } from '../src/lib/utils/inventoryEncryption';
import typesenseService from '../src/lib/typesense';

async function migrateInventoryToTypesense() {
  console.log('🚀 Starting migration to Typesense...');

  try {
    // Connect to Typesense
    const connected = await typesenseService.connect();
    if (!connected) {
      throw new Error('Failed to connect to Typesense');
    }

    // Ensure collection exists
    await typesenseService.ensureCollectionExists('inventory_items');

    // Get all inventory items from database
    console.log('📊 Fetching inventory items from database...');
    const items = await db.select().from(inventoryItems);
    console.log(`Found ${items.length} items to migrate`);

    // Get all sizes for all items
    console.log('📏 Fetching sizes from database...');
    const allSizes = await db.select().from(inventorySizes);
    
    // Group sizes by item ID
    const sizesByItemId = allSizes.reduce((acc, size) => {
      if (!acc[size.itemId]) {
        acc[size.itemId] = [];
      }
      acc[size.itemId].push(size);
      return acc;
    }, {} as Record<number, any[]>);

    // Get all tags for all items
    console.log('🏷️ Fetching tags from database...');
    const allTags = await db
      .select({
        itemId: inventoryTags.itemId,
        tagName: tags.name,
      })
      .from(inventoryTags)
      .innerJoin(tags, eq(inventoryTags.tagId, tags.id));

    // Group tags by item ID
    const tagsByItemId = allTags.reduce((acc, item) => {
      const decryptedTagName = decryptTagData({ name: item.tagName }).name;
      if (!acc[item.itemId]) {
        acc[item.itemId] = [];
      }
      acc[item.itemId].push(decryptedTagName);
      return acc;
    }, {} as Record<number, string[]>);

    // Prepare documents for Typesense
    console.log('🔄 Preparing documents for Typesense...');
    
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

    // Generate formatted ID using same logic as API routes
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

    const documents = items.map((item) => ({
      id: item.id,
      formattedId: getFormattedId(item.category, item.categoryCounter),
      name: item.name,
      category: item.category,
      tags: tagsByItemId[item.id] || [],
      sizes: sizesByItemId[item.id] || [],
      imageUrl: item.imageUrl,
      createdAt: new Date(item.createdAt).getTime(),
      updatedAt: new Date(item.updatedAt).getTime(),
    }));

    // Bulk index to Typesense
    console.log('📤 Indexing documents to Typesense...');
    await typesenseService.bulkIndex('inventory_items', documents);

    console.log('✅ Migration completed successfully!');
    console.log(`📈 Indexed ${documents.length} items to Typesense`);

    // Test search
    console.log('🧪 Testing search functionality...');
    const testSearch = await typesenseService.search('inventory_items', {
      q: '*',
      query_by: 'name,category,tags,formattedId',
      per_page: 5,
    });

    console.log(`🔍 Test search returned ${(testSearch.hits as any[])?.length || 0} results`);
    console.log('🎉 Typesense is ready to use!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateInventoryToTypesense()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateInventoryToTypesense };
