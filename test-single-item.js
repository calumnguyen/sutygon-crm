const { Client } = require('@elastic/elasticsearch');
const { Pool } = require('pg');
require('dotenv').config();

const crypto = require('crypto');

// Decryption function
function decryptField(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (!encryptedText.includes(':')) return encryptedText;

  try {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('ENCRYPTION_KEY not found');

    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) return encryptedText;

    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedData = textParts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error for:', encryptedText?.substring(0, 20), error.message);
    return encryptedText;
  }
}

async function testSingleItem() {
  console.log('🧪 Testing Single Item Indexing');
  console.log('==============================');

  try {
    const esClient = new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY
      }
    });

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    // Get one real item
    console.log('📦 Fetching one item from database...');
    const itemResult = await pool.query(`
      SELECT id, name, category, category_counter, image_url, created_at, updated_at 
      FROM inventory_items 
      ORDER BY id 
      LIMIT 1
    `);

    if (itemResult.rows.length === 0) {
      console.error('❌ No items found in database');
      return;
    }

    const item = itemResult.rows[0];
    console.log('✅ Found item:', item.id);

    // Get sizes and tags for this item
    const [sizesResult, tagsResult] = await Promise.all([
      pool.query(`
        SELECT item_id, title, quantity, on_hand, price 
        FROM inventory_sizes 
        WHERE item_id = $1
      `, [item.id]),
      pool.query(`
        SELECT it.item_id, t.name as tag_name 
        FROM inventory_tags it 
        JOIN tags t ON it.tag_id = t.id 
        WHERE it.item_id = $1
      `, [item.id])
    ]);

    console.log('✅ Found', sizesResult.rows.length, 'sizes and', tagsResult.rows.length, 'tags');

    // Process the data
    console.log('🔓 Decrypting data...');
    const decryptedName = decryptField(item.name);
    const decryptedCategory = decryptField(item.category);

    console.log('📝 Decrypted name:', decryptedName);
    console.log('📝 Decrypted category:', decryptedCategory);

    // Process sizes
    const itemSizes = sizesResult.rows.map(s => {
      const decryptedTitle = decryptField(s.title);
      const decryptedQuantity = decryptField(s.quantity);
      const decryptedOnHand = decryptField(s.on_hand);
      const decryptedPrice = decryptField(s.price);

      console.log('📏 Size:', {
        title: decryptedTitle,
        quantity: decryptedQuantity,
        onHand: decryptedOnHand,
        price: decryptedPrice
      });

      return {
        title: decryptedTitle,
        quantity: parseInt(decryptedQuantity) || 0,
        onHand: parseInt(decryptedOnHand) || 0,
        price: parseInt(decryptedPrice) || 0
      };
    });

    // Process tags
    const itemTags = tagsResult.rows.map(t => {
      const decryptedTag = decryptField(t.tag_name);
      console.log('🏷️ Tag:', decryptedTag);
      return decryptedTag;
    }).filter(tag => tag && tag.trim());

    // Generate formatted ID
    const categoryPrefix = decryptedCategory.substring(0, 2).toUpperCase();
    const formattedId = `${categoryPrefix}-${item.category_counter.toString().padStart(6, '0')}`;

    // Create document
    const doc = {
      id: item.id,
      formattedId: formattedId,
      name: decryptedName,
      category: decryptedCategory,
      imageUrl: item.image_url,
      tags: itemTags,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      sizes: itemSizes
    };

    console.log('\n📋 Final document:');
    console.log(JSON.stringify(doc, null, 2));

    // Try to index this single item
    console.log('\n📤 Attempting to index item...');
    
    try {
      const response = await esClient.index({
        index: 'inventory_items',
        id: item.id.toString(),
        document: doc
      });

      console.log('✅ SUCCESS! Item indexed successfully');
      console.log('📊 Response:', response.result);

      // Test searching for it
      await esClient.indices.refresh({ index: 'inventory_items' });
      const searchResult = await esClient.search({
        index: 'inventory_items',
        query: {
          term: { id: item.id }
        }
      });

      console.log('🔍 Search test:', searchResult.hits.total.value, 'documents found');

      if (searchResult.hits.hits.length > 0) {
        console.log('📄 Retrieved document has imageUrl:', !!searchResult.hits.hits[0]._source.imageUrl);
        console.log('📄 Retrieved document has tags:', searchResult.hits.hits[0]._source.tags?.length || 0, 'tags');
      }

    } catch (indexError) {
      console.error('❌ Indexing failed:', indexError.message);
      if (indexError.meta && indexError.meta.body) {
        console.error('📝 Error details:', JSON.stringify(indexError.meta.body, null, 2));
      }
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSingleItem(); 