import { Client } from '@elastic/elasticsearch';

class ElasticsearchService {
  private client: Client;
  private isConnected: boolean = false;

  constructor() {
    const config: Record<string, unknown> = {
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      requestTimeout: 30000,
      pingTimeout: 3000,
    };

    // Add authentication if credentials are provided
    if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
      config.auth = {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      };
    }

    // Add API key authentication if provided
    if (process.env.ELASTICSEARCH_API_KEY) {
      config.auth = {
        apiKey: process.env.ELASTICSEARCH_API_KEY,
      };
    }

    this.client = new Client(config);
  }

  async connect(): Promise<boolean> {
    try {
      await this.client.ping();
      this.isConnected = true;
      console.log('✓ Connected to Elasticsearch');
      return true;
    } catch (error) {
      console.error('✗ Failed to connect to Elasticsearch:', error);
      this.isConnected = false;
      return false;
    }
  }

  async ensureIndexExists(indexName: string): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: indexName });

      if (!exists) {
        await this.client.indices.create({
          index: indexName,
          settings: {
            analysis: {
              analyzer: {
                vietnamese_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding'],
                },
              },
            },
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
                  search: {
                    type: 'text',
                    analyzer: 'vietnamese_analyzer',
                  },
                },
              },
              category: {
                type: 'text',
                analyzer: 'vietnamese_analyzer',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              tags: {
                type: 'text',
                analyzer: 'vietnamese_analyzer',
              },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              sizes: {
                type: 'nested',
                properties: {
                  title: { type: 'keyword' },
                  quantity: { type: 'integer' },
                  onHand: { type: 'integer' },
                  price: { type: 'long' },
                },
              },
            },
          },
        });
        console.log(`✓ Created index: ${indexName}`);
      } else {
        console.log(`✓ Index exists: ${indexName}`);
      }
    } catch (error) {
      console.error(`✗ Failed to ensure index exists: ${indexName}`, error);
      throw error;
    }
  }

  async indexDocument(
    indexName: string,
    id: string,
    document: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.client.index({
        index: indexName,
        id,
        document,
        refresh: 'wait_for',
      });
    } catch (error) {
      console.error(`Failed to index document ${id}:`, error);
      throw error;
    }
  }

  async bulkIndex(
    indexName: string,
    documents: Array<{ id: string; doc: Record<string, unknown> }>
  ): Promise<void> {
    if (documents.length === 0) return;

    const body = documents.flatMap(({ id, doc }) => [
      { index: { _index: indexName, _id: id } },
      doc,
    ]);

    try {
      const response = await this.client.bulk({
        operations: body,
        refresh: 'wait_for',
      });

      if (response.errors) {
        console.error('Bulk indexing errors:', response.items);
      } else {
        console.log(`✓ Bulk indexed ${documents.length} documents`);
      }
    } catch (error) {
      console.error('Bulk indexing failed:', error);
      throw error;
    }
  }

  async search(indexName: string, query: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.search({
        index: indexName,
        ...query,
      });
      return response;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  async deleteDocument(indexName: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index: indexName,
        id,
        refresh: 'wait_for',
      });
    } catch (error) {
      console.error(`Failed to delete document ${id}:`, error);
      throw error;
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    try {
      await this.client.indices.delete({ index: indexName });
      console.log(`✓ Deleted index: ${indexName}`);
    } catch (error) {
      console.error(`Failed to delete index ${indexName}:`, error);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }

  isElasticsearchConnected(): boolean {
    return this.isConnected;
  }
}

// Create a singleton instance
export const elasticsearchService = new ElasticsearchService();
export default elasticsearchService;
