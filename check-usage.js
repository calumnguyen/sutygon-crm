const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

async function checkElasticsearchUsage() {
  console.log('📊 ELASTICSEARCH USAGE REPORT');
  console.log('==============================');

  try {
    const esClient = new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY
      },
      requestTimeout: 30000,
    });

    // Check cluster info
    console.log('🔍 Cluster Information:');
    const clusterInfo = await esClient.info();
    console.log(`   Cluster: ${clusterInfo.cluster_name}`);
    console.log(`   Version: ${clusterInfo.version.number}`);

    // Check index stats
    console.log('\n📈 Index Statistics:');
    try {
      const indexStats = await esClient.indices.stats({ index: 'inventory_items' });
      const stats = indexStats.indices?.inventory_items;
      
      if (stats) {
        console.log(`   📄 Document Count: ${stats.total?.docs?.count || 0} documents`);
        console.log(`   💾 Storage Size: ${Math.round((stats.total?.store?.size_in_bytes || 0) / 1024 / 1024 * 100) / 100} MB`);
        console.log(`   🔍 Search Operations: ${stats.total?.search?.query_total || 0} searches`);
        console.log(`   📝 Indexing Operations: ${stats.total?.indexing?.index_total || 0} indexing ops`);
      }
    } catch (error) {
      console.log('   ⚠️ Index "inventory_items" not found or empty');
    }

    // Check all indices
    console.log('\n📋 All Indices:');
    const indices = await esClient.cat.indices({ format: 'json' });
    let totalSize = 0;
    let totalDocs = 0;

    indices.forEach(index => {
      const sizeBytes = parseInt(index['store.size']) || 0;
      const sizeMB = Math.round(sizeBytes / 1024 / 1024 * 100) / 100;
      totalSize += sizeMB;
      totalDocs += parseInt(index['docs.count']) || 0;
      
      console.log(`   📁 ${index.index}: ${index['docs.count']} docs, ${sizeMB} MB`);
    });

    console.log('\n💰 COST ESTIMATION:');
    console.log('===================');
    console.log(`   📊 Total Storage: ${totalSize} MB`);
    console.log(`   📄 Total Documents: ${totalDocs}`);
    
    // Storage cost estimation (Elastic Cloud Serverless pricing)
    const storageGB = totalSize / 1024;
    const storageCostPerMonth = storageGB * 0.25; // ~$0.25/GB/month
    
    console.log(`   💵 Estimated Storage Cost: $${storageCostPerMonth.toFixed(2)}/month`);
    
    if (storageGB < 0.1) {
      console.log('   ✅ Very small usage - should be within free tier limits');
    } else if (storageCostPerMonth < 5) {
      console.log('   ✅ Low cost - within your $5-10 budget');
    } else if (storageCostPerMonth < 25) {
      console.log('   ⚠️ Moderate cost - may exceed your budget');
    } else {
      console.log('   ❌ High cost - definitely exceeds your budget');
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    if (storageGB < 0.5) {
      console.log('   📈 Current usage is very light');
      console.log('   💡 Consider PostgreSQL optimization instead for $0 cost');
    } else {
      console.log('   📈 Current usage is significant');
      console.log('   💡 Monitor billing dashboard closely');
    }

  } catch (error) {
    console.error('❌ Error checking usage:', error.message);
    
    if (error.message.includes('Unauthorized')) {
      console.log('\n🔑 Check your API key in .env file');
    }
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 Check your URL in .env file');
    }
  }
}

checkElasticsearchUsage(); 