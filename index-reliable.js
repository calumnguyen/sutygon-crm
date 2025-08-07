const { Client } = require('@elastic/elasticsearch');
const { Pool } = require('pg');
require('dotenv').config();

const crypto = require('crypto');

// Correct decryption function (matches app encryption.ts)
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
    console.error('Decryption error for:', encryptedText.substring(0, 20), error.message);
    return encryptedText;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function indexInventoryReliable() {
  console.log('🔄 RELIABLE INDEXING - Small Batches for All Items');
  console.log('=================================================');

  try {
    // Setup Elasticsearch client with conservative timeouts
    const esClient = new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY
      },
      maxRetries: 3,
      requestTimeout: 120000, // 2 minutes
      sniffOnStart: false
    });

    // Setup database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5, // Smaller pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    const indexName = 'inventory_items';

    // Create index with proper mappings
    console.log('🔧 Setting up optimized index...');
    try {
      const exists = await esClient.indices.exists({ index: indexName });
      if (exists) {
        console.log('🗑️ Deleting existing index for fresh start...');
        await esClient.indices.delete({ index: indexName });
      }

      await esClient.indices.create({
        index: indexName,
        settings: {
          analysis: {
            analyzer: {
              vietnamese_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding']
              }
            }
          }
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            formattedId: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'vietnamese_analyzer',
              fields: {
                keyword: { type: 'keyword' },
                search: { type: 'text', analyzer: 'vietnamese_analyzer' }
              }
            },
                         category: {
               type: 'text',
               analyzer: 'vietnamese_analyzer',
               fields: { keyword: { type: 'keyword' } }
             },
            tags: {
              type: 'text',
              analyzer: 'vietnamese_analyzer',
              fields: { keyword: { type: 'keyword' } }
            },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            sizes: {
              type: 'nested',
              properties: {
                title: { type: 'keyword' },
                quantity: { type: 'integer' },
                onHand: { type: 'integer' },
                price: { type: 'long' }
              }
            }
          }
        }
      });
      console.log('✅ Index created successfully');
    } catch (error) {
      console.error('Index creation error:', error.message);
      throw error;
    }

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM inventory_items');
    const totalItems = parseInt(countResult.rows[0].count);
    console.log(`📊 Found ${totalItems} items to index`);

    // Small batch sizes for reliability
    const BATCH_SIZE = 10; // Very small batches
    const BULK_SIZE = 5;   // Very small bulk requests
    let processed = 0;
    let bulkBody = [];
    let successCount = 0;
    let errorCount = 0;

    const startTime = Date.now();

    for (let offset = 0; offset < totalItems; offset += BATCH_SIZE) {
      const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(totalItems / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${processed}/${totalItems})...`);

      try {
        // Get items for this batch
        const itemsResult = await pool.query(`
          SELECT id, name, category, category_counter, image_url, created_at, updated_at 
          FROM inventory_items 
          ORDER BY id 
          LIMIT $1 OFFSET $2
        `, [BATCH_SIZE, offset]);

        const batchItems = itemsResult.rows;
        if (batchItems.length === 0) break;

        // Get related data for these items
        const itemIds = batchItems.map(item => item.id);
        const [sizesResult, tagsResult] = await Promise.all([
          pool.query(`
            SELECT item_id, title, quantity, on_hand, price 
            FROM inventory_sizes 
            WHERE item_id = ANY($1)
          `, [itemIds]),
          pool.query(`
            SELECT it.item_id, t.name as tag_name 
            FROM inventory_tags it 
            JOIN tags t ON it.tag_id = t.id 
            WHERE it.item_id = ANY($1)
          `, [itemIds])
        ]);

        // Process each item
        for (const item of batchItems) {
          try {
            const decryptedName = decryptField(item.name);
            const decryptedCategory = decryptField(item.category);

            // Get sizes for this item
            const itemSizes = sizesResult.rows
              .filter(s => s.item_id === item.id)
              .map(s => ({
                title: decryptField(s.title),
                quantity: parseInt(decryptField(s.quantity)) || 0,
                onHand: parseInt(decryptField(s.on_hand)) || 0,
                price: parseInt(decryptField(s.price)) || 0
              }));

            // Get tags for this item
            const itemTags = tagsResult.rows
              .filter(t => t.item_id === item.id)
              .map(t => decryptField(t.tag_name))
              .filter(tag => tag && tag.trim());

            // Generate formatted ID using same logic as API routes
            function getFormattedId(category, categoryCounter) {
              let code = (category || 'XX')
                .split(' ')
                .map(w => w[0])
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
            
            const formattedId = getFormattedId(decryptedCategory, item.category_counter);

            // Create document with ALL data (excluding imageUrl to avoid size limit)
            const doc = {
              id: item.id,
              formattedId: formattedId,
              name: decryptedName,
              category: decryptedCategory,
              // imageUrl: item.image_url, // Excluded - too large for Elasticsearch
              tags: itemTags,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
              sizes: itemSizes
            };

            // Add to bulk request
            bulkBody.push(
              { index: { _index: indexName, _id: item.id.toString() } },
              doc
            );

            processed++;

          } catch (itemError) {
            console.error(`❌ Error processing item ${item.id}:`, itemError.message);
            errorCount++;
          }
        }

        // Execute bulk request when we have enough items
        if (bulkBody.length >= BULK_SIZE * 2) {
          try {
            console.log(`📤 Indexing ${bulkBody.length / 2} items...`);
            const response = await esClient.bulk({
              operations: bulkBody,
              refresh: false
            });

            if (response.errors) {
              const errorItems = response.items.filter(item => item.index && item.index.error);
              console.error(`⚠️ Bulk errors: ${errorItems.length}`);
              errorCount += errorItems.length;
            } else {
              successCount += bulkBody.length / 2;
            }

            bulkBody = []; // Clear for next batch
            console.log(`✅ Batch completed. Success: ${successCount}, Errors: ${errorCount}`);

            // Small delay to avoid overwhelming the service
            await sleep(500);

          } catch (bulkError) {
            console.error(`❌ Bulk indexing error:`, bulkError.message);
            bulkBody = []; // Clear and continue
            errorCount += bulkBody.length / 2;
          }
        }

      } catch (batchError) {
        console.error(`❌ Batch ${batchNum} error:`, batchError.message);
        errorCount += BATCH_SIZE;
        await sleep(1000); // Wait before continuing
      }

      // Progress update
      const elapsed = Date.now() - startTime;
      const itemsPerSecond = processed / (elapsed / 1000);
      const estimatedTotal = (totalItems / processed) * elapsed;
      const eta = Math.round((estimatedTotal - elapsed) / 1000);
      console.log(`⏱️ Progress: ${Math.round((processed / totalItems) * 100)}% | ${itemsPerSecond.toFixed(1)} items/sec | ETA: ${eta}s`);
    }

    // Index any remaining items
    if (bulkBody.length > 0) {
      try {
        console.log(`📤 Indexing final ${bulkBody.length / 2} items...`);
        const response = await esClient.bulk({
          operations: bulkBody,
          refresh: true // Final refresh
        });

        if (!response.errors) {
          successCount += bulkBody.length / 2;
        }
      } catch (finalError) {
        console.error(`❌ Final bulk error:`, finalError.message);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log('\n🎉 INDEXING COMPLETE!');
    console.log('====================');
    console.log(`📊 Total items: ${totalItems}`);
    console.log(`✅ Successfully indexed: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏱️ Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`📈 Average speed: ${(processed / (totalTime / 1000)).toFixed(1)} items/sec`);

    if (successCount === totalItems) {
      console.log('🎯 ALL ITEMS INDEXED SUCCESSFULLY!');
    } else {
      console.log(`⚠️ ${totalItems - successCount} items may need retry`);
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

indexInventoryReliable(); 