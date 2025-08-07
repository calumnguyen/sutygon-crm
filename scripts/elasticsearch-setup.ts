#!/usr/bin/env npx tsx

import { inventoryIndexer } from '../src/lib/elasticsearch/indexer';

async function main() {
  const command = process.argv[2];
  
  console.log('🔍 Elasticsearch Management Script');
  console.log('================================');
  
  try {
    switch (command) {
      case 'init':
        console.log('🚀 Initializing Elasticsearch...');
        await inventoryIndexer.initialize();
        console.log('✅ Elasticsearch initialized successfully');
        break;
        
      case 'index':
        console.log('📦 Starting full reindex of inventory items...');
        await inventoryIndexer.initialize();
        await inventoryIndexer.indexAllItems();
        console.log('✅ All items indexed successfully');
        break;
        
      case 'reindex':
        console.log('🔄 Recreating index and reindexing all items...');
        await inventoryIndexer.initialize();
        await inventoryIndexer.recreateIndex();
        console.log('✅ Index recreated and all items reindexed successfully');
        break;
        
      case 'test':
        console.log('🧪 Testing Elasticsearch connection...');
        await inventoryIndexer.initialize();
        console.log('✅ Connection test successful');
        break;
        
      default:
        console.log('Usage: npx tsx scripts/elasticsearch-setup.ts <command>');
        console.log('');
        console.log('Commands:');
        console.log('  init      - Initialize Elasticsearch and create index');
        console.log('  index     - Index all inventory items');
        console.log('  reindex   - Recreate index and reindex all items');
        console.log('  test      - Test Elasticsearch connection');
        console.log('');
        console.log('Examples:');
        console.log('  npx tsx scripts/elasticsearch-setup.ts init');
        console.log('  npx tsx scripts/elasticsearch-setup.ts index');
        console.log('  npx tsx scripts/elasticsearch-setup.ts reindex');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
} 