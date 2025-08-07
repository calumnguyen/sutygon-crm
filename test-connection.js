const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

async function testElasticsearch() {
  console.log('🔍 Testing Elasticsearch Connection');
  console.log('==================================');

  try {
    const esClient = new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY
      },
      requestTimeout: 30000,
    });

    console.log('📡 Testing connection...');
    const info = await esClient.info();
    console.log('✅ Connection successful!');
    console.log('📊 Cluster info:', {
      name: info.cluster_name,
      version: info.version.number,
      tagline: info.tagline
    });

    console.log('\n🔧 Testing index operations...');
    
    // Test creating a simple index
    const testIndex = 'test-connection-' + Date.now();
    try {
      await esClient.indices.create({
        index: testIndex,
        mappings: {
          properties: {
            test_field: { type: 'text' }
          }
        }
      });
      console.log('✅ Index creation successful');

      // Test indexing a document
      await esClient.index({
        index: testIndex,
        id: '1',
        document: {
          test_field: 'Hello World'
        }
      });
      console.log('✅ Document indexing successful');

      // Test searching
      await esClient.indices.refresh({ index: testIndex });
      const searchResult = await esClient.search({
        index: testIndex,
        query: {
          match_all: {}
        }
      });
      console.log('✅ Search successful:', searchResult.hits.total.value, 'documents found');

      // Cleanup
      await esClient.indices.delete({ index: testIndex });
      console.log('✅ Cleanup successful');

      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('Your Elasticsearch setup is working correctly.');

    } catch (indexError) {
      console.error('❌ Index operation failed:', indexError.message);
      if (indexError.meta && indexError.meta.body) {
        console.error('📝 Error details:', JSON.stringify(indexError.meta.body, null, 2));
      }
    }

  } catch (connectionError) {
    console.error('❌ Connection failed:', connectionError.message);
    
    if (connectionError.message.includes('Unauthorized')) {
      console.error('\n🔑 Authentication Issue:');
      console.error('- Check your ELASTICSEARCH_API_KEY');
      console.error('- Verify the API key has proper permissions');
      console.error('- Ensure the key hasn\'t expired');
    }
    
    if (connectionError.message.includes('ENOTFOUND') || connectionError.message.includes('timeout')) {
      console.error('\n🌐 Network Issue:');
      console.error('- Check your ELASTICSEARCH_URL');
      console.error('- Verify your internet connection');
      console.error('- Check if Elastic Cloud is accessible');
    }

    console.error('\n🔧 Current configuration:');
    console.error('- URL:', process.env.ELASTICSEARCH_URL ? 'Set' : 'Missing');
    console.error('- API Key:', process.env.ELASTICSEARCH_API_KEY ? 'Set (length: ' + process.env.ELASTICSEARCH_API_KEY.length + ')' : 'Missing');
  }
}

testElasticsearch(); 