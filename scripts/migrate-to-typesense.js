// Load environment variables
require('dotenv').config({ path: '.env' });

const Typesense = require('typesense');
const { neon } = require('@neondatabase/serverless');

// Database connection
const sql = neon(process.env.DATABASE_URL);

// Typesense client
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'yxrug1oc0p9qbhwnp-1.a1.typesense.net',
      port: 443,
      protocol: 'https',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || '6MKMt05mWqspIfP2iYDJ5bmpPfTcdHqi',
  connectionTimeoutSeconds: 30,
});

async function migrateInventoryToTypesense() {
  console.log('🚀 Starting migration to Typesense...');

  try {
    // Test Typesense connection
    const collections = await typesenseClient.collections().retrieve();
    console.log('✅ Connected to Typesense');
    console.log('📚 Available collections:', collections.map(col => col.name));

    // Ensure collection exists
    const collectionName = 'inventory_items';
    const collectionExists = collections.some(col => col.name === collectionName);
    
    if (collectionExists) {
      console.log(`🗑️ Deleting existing collection: ${collectionName}`);
      await typesenseClient.collections(collectionName).delete();
    }

    console.log(`🔧 Creating collection: ${collectionName}`);
    const schema = {
      name: collectionName,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'formattedId', type: 'string' },
        { 
          name: 'name', 
          type: 'string',
          facet: true,
          sort: true,
          infix: true,
        },
        { 
          name: 'category', 
          type: 'string',
          facet: true,
          sort: true,
        },
        { 
          name: 'tags', 
          type: 'string[]',
          facet: true,
          optional: true,
        },
        { name: 'createdAt', type: 'int64', sort: true },
        { name: 'updatedAt', type: 'int64', sort: true },
        { name: 'imageUrl', type: 'string', optional: true },
      ],
      default_sorting_field: 'updatedAt',
      enable_nested_fields: true,
    };

    await typesenseClient.collections().create(schema);
    console.log('✅ Collection created successfully');

    // Get all inventory items from database in batches
    console.log('📊 Fetching inventory items from database...');
    
    // First, get the total count
    const countResult = await sql`SELECT COUNT(*) as total FROM inventory_items`;
    const totalItems = parseInt(countResult[0].total);
    console.log(`Total items to migrate: ${totalItems}`);
    
    // Process in batches of 1000
    const batchSize = 1000;
    const items = [];
    
    for (let offset = 0; offset < totalItems; offset += batchSize) {
      console.log(`📦 Fetching batch ${Math.floor(offset / batchSize) + 1}/${Math.ceil(totalItems / batchSize)} (${offset + 1}-${Math.min(offset + batchSize, totalItems)})`);
      const batch = await sql`
        SELECT 
          id, 
          name, 
          category, 
          category_counter,
          created_at, 
          updated_at
        FROM inventory_items 
        ORDER BY id 
        LIMIT ${batchSize} 
        OFFSET ${offset}
      `;
      items.push(...batch);
    }
    
    console.log(`Found ${items.length} items to migrate`);

    // Get all tags for all items
    console.log('🏷️ Fetching tags from database...');
    const allTags = await sql`
      SELECT it.item_id, t.name 
      FROM inventory_tags it 
      JOIN tags t ON it.tag_id = t.id
    `;

    // Group tags by item ID
    const tagsByItemId = {};
    allTags.forEach(item => {
      if (!tagsByItemId[item.item_id]) {
        tagsByItemId[item.item_id] = [];
      }
      // Decrypt tag name
      const decryptedTagName = item.name; // Tags are already decrypted in the query
      tagsByItemId[item.item_id].push(decryptedTagName);
    });

    // Prepare documents for Typesense
    console.log('🔄 Preparing documents for Typesense...');
    
    // Category code mapping for consistent IDs (same as sync service)
    const CATEGORY_CODE_MAP = {
      'Áo Dài': 'AD',
      'Áo': 'AO',
      'Quần': 'QU',
      'Văn Nghệ': 'VN',
      'Đồ Tây': 'DT',
      'Giầy': 'GI',
      'Dụng Cụ': 'DC',
      'Đầm Dạ Hội': 'DH',
    };

    // Generate formatted ID using same logic as sync service
    function getFormattedId(category, categoryCounter) {
      let code = CATEGORY_CODE_MAP[category];
      if (!code) {
        // Fallback for unknown categories - generate from first letters
        code = (category || 'XX')
          .split(' ')
          .map((w) => w[0])
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
      id: item.id.toString(),
      formattedId: getFormattedId(item.category, item.category_counter || 1), // Use proper formatted ID
      name: item.name,
      category: item.category,
      tags: tagsByItemId[item.id] || [],
      imageUrl: null, // We'll fetch this separately if needed
      createdAt: new Date(item.created_at).getTime(),
      updatedAt: new Date(item.updated_at).getTime(),
    }));

    // Bulk index to Typesense
    console.log('📤 Indexing documents to Typesense...');
    const response = await typesenseClient
      .collections(collectionName)
      .documents()
      .import(documents);

    const failedItems = response.filter(item => item.success === false);
    if (failedItems.length > 0) {
      console.error('❌ Some documents failed to index:', failedItems);
    } else {
      console.log('✅ All documents indexed successfully');
    }

    console.log(`📈 Indexed ${documents.length} items to Typesense`);

    // Test search
    console.log('🧪 Testing search functionality...');
    const testSearch = await typesenseClient.collections(collectionName).documents().search({
      q: '*',
      query_by: 'name,category,tags,formattedId',
      per_page: 5,
    });

    console.log(`🔍 Test search returned ${testSearch.hits?.length || 0} results`);
    console.log('🎉 Typesense is ready to use!');

    // Show some sample results
    if (testSearch.hits && testSearch.hits.length > 0) {
      console.log('\n📋 Sample search results:');
      testSearch.hits.slice(0, 3).forEach((hit, index) => {
        console.log(`${index + 1}. ${hit.document.name} (${hit.document.category})`);
      });
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
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

module.exports = { migrateInventoryToTypesense };
