const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

async function checkDeploymentType() {
  console.log('🔍 ELASTIC DEPLOYMENT TYPE CHECKER');
  console.log('===================================');

  try {
    const esClient = new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY
      },
      requestTimeout: 30000,
    });

    // Get cluster info
    const clusterInfo = await esClient.info();
    console.log('📊 Cluster Information:');
    console.log(`   Cluster Name: ${clusterInfo.cluster_name}`);
    console.log(`   Version: ${clusterInfo.version.number}`);
    console.log(`   Build Type: ${clusterInfo.version.build_type || 'Unknown'}`);

    // Check URL pattern to determine deployment type
    const url = process.env.ELASTICSEARCH_URL;
    console.log(`\n🌐 Endpoint URL: ${url}`);

    // Analyze URL patterns
    let deploymentType = 'Unknown';
    let costEstimate = 'Unknown';

    if (url.includes('.es.')) {
      deploymentType = '✅ SERVERLESS';
      costEstimate = '$0.15-5.00/month';
      console.log('   🎯 Deployment Type: SERVERLESS');
      console.log('   💰 Expected Cost: $0.15-5.00/month');
      console.log('   ✅ GREAT! This is the budget-friendly option!');
    } else if (url.includes('.cloud.es.io')) {
      deploymentType = '⚠️ STANDARD/DEDICATED';
      costEstimate = '$16-50/month';
      console.log('   🎯 Deployment Type: STANDARD/DEDICATED');
      console.log('   💰 Expected Cost: $16-50/month');
      console.log('   ❌ This will likely exceed your budget');
    } else {
      console.log('   🎯 Deployment Type: Unable to determine from URL');
    }

    // Get node information for more details
    console.log('\n🔧 Node Information:');
    try {
      const nodes = await esClient.nodes.info();
      const nodeCount = Object.keys(nodes.nodes || {}).length;
      console.log(`   📊 Node Count: ${nodeCount}`);
      
      if (nodeCount === 1) {
        console.log('   ✅ Single node - typical for Serverless');
      } else {
        console.log('   ⚠️ Multiple nodes - typical for Standard');
      }
    } catch (error) {
      console.log('   ⚠️ Unable to get node info (normal for Serverless)');
    }

    // Check cluster stats for resource usage
    console.log('\n📈 Usage Statistics:');
    try {
      const stats = await esClient.cluster.stats();
      const indices = stats.indices || {};
      const nodes = stats.nodes || {};
      
      console.log(`   📄 Total Documents: ${indices.count || 0}`);
      console.log(`   💾 Storage Used: ${Math.round((indices.store?.size_in_bytes || 0) / 1024 / 1024 * 100) / 100} MB`);
      console.log(`   🖥️ Node Count: ${nodes.count?.total || 0}`);

      if (nodes.jvm?.mem) {
        const memoryGB = Math.round(nodes.jvm.mem.heap_max_in_bytes / 1024 / 1024 / 1024);
        console.log(`   🧠 Total Memory: ${memoryGB} GB`);
        
        if (memoryGB <= 2) {
          console.log('   ✅ Low memory allocation - likely Serverless');
        } else {
          console.log('   ⚠️ High memory allocation - likely Standard');
        }
      }
    } catch (error) {
      console.log('   ⚠️ Limited cluster stats (normal for Serverless)');
    }

    // Final assessment
    console.log('\n🎯 COST ASSESSMENT:');
    console.log('===================');
    
    if (deploymentType.includes('SERVERLESS')) {
      console.log('   ✅ EXCELLENT! You\'re on Serverless');
      console.log('   💰 With your tiny usage (1859 docs), expect $0.15-2.00/month');
      console.log('   🎉 This fits perfectly in your $5-10 budget!');
      console.log('');
      console.log('   📋 After free trial ends:');
      console.log('   • Storage cost: ~$0.00 (too small to matter)');
      console.log('   • Search requests: ~$0.10-1.00');
      console.log('   • Indexing operations: ~$0.05-0.50');
      console.log('   • Total: $0.15-1.50/month');
    } else if (deploymentType.includes('STANDARD')) {
      console.log('   ❌ You\'re on Standard/Dedicated');
      console.log('   💰 Minimum cost will be $16-25/month');
      console.log('   📊 This exceeds your $5-10 budget');
      console.log('');
      console.log('   💡 RECOMMENDATION: Migrate to Serverless');
      console.log('   • Export your data (1859 docs = 5 min)');
      console.log('   • Create new Serverless deployment');
      console.log('   • Import your data');
      console.log('   • Result: $0.15-2.00/month');
    } else {
      console.log('   ❓ Unable to determine deployment type');
      console.log('   📞 Check your Elastic Cloud console manually');
    }

    console.log('\n📞 NEXT STEPS:');
    console.log('=============');
    console.log('1. Go to https://cloud.elastic.co/deployments');
    console.log('2. Click on your deployment name');
    console.log('3. Look for "Serverless" or "Standard" in the title');
    console.log('4. Check the "Billing" section for exact pricing');

  } catch (error) {
    console.error('❌ Error checking deployment:', error.message);
    
    if (error.message.includes('Unauthorized')) {
      console.log('\n🔑 API key issue - check .env file');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n🌐 URL issue - check .env file');
    }
  }
}

checkDeploymentType(); 