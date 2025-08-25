/* eslint-disable @typescript-eslint/no-explicit-any */
import Typesense from 'typesense';

class TypesenseService {
  private client: any;
  private isConnected: boolean = false;

  constructor() {
    const config: any = {
      nodes: [
        {
          host: process.env.TYPESENSE_HOST || 'yxrug1oc0p9qbhwnp-1.a1.typesense.net',
          port: 443,
          protocol: 'https',
        },
      ],
      apiKey: process.env.TYPESENSE_API_KEY || '6MKMt05mWqspIfP2iYDJ5bmpPfTcdHqi',
      connectionTimeoutSeconds: 60, // Increased from 30 to 60 seconds
      retryIntervalSeconds: 0.1,
      numRetries: 3,
    };

    this.client = new Typesense.Client(config);
  }

  async connect(): Promise<boolean> {
    try {
      // Test connection by listing collections
      await this.client.collections().retrieve();
      this.isConnected = true;
      console.log('✓ Connected to Typesense');
      return true;
    } catch (error) {
      console.error('✗ Failed to connect to Typesense:', error);
      this.isConnected = false;
      return false;
    }
  }

  async ensureCollectionExists(collectionName: string): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.collections().retrieve();
      const collectionExists = collections.some((col: any) => col.name === collectionName);

      if (!collectionExists) {
        // Create collection with schema optimized for Vietnamese text search
        const schema: any = {
          name: collectionName,
          fields: [
            { name: 'id', type: 'string' },
            { name: 'formattedId', type: 'string' },
            {
              name: 'name',
              type: 'string',
              facet: true,
              sort: true,
              infix: true, // Enable prefix/suffix matching
            },
            {
              name: 'nameNormalized',
              type: 'string',
              optional: true,
            },
            {
              name: 'category',
              type: 'string',
              facet: true,
              sort: true,
            },
            {
              name: 'categoryNormalized',
              type: 'string',
              optional: true,
            },
            {
              name: 'tags',
              type: 'string[]',
              facet: true,
              optional: true,
            },
            { name: 'sizes', type: 'object[]', optional: true },
            { name: 'createdAt', type: 'int64', sort: true },
            { name: 'updatedAt', type: 'int64', sort: true },
            { name: 'imageUrl', type: 'string', optional: true },
          ],
          default_sorting_field: 'updatedAt',
          enable_nested_fields: true,
        };

        await this.client.collections().create(schema);
        console.log(`✓ Created collection: ${collectionName}`);
      } else {
        console.log(`✓ Collection exists: ${collectionName}`);
      }
    } catch (error) {
      console.error(`✗ Failed to ensure collection exists: ${collectionName}`, error);
      throw error;
    }
  }

  async indexDocument(collectionName: string, document: Record<string, unknown>): Promise<void> {
    try {
      // Use upsert to handle both create and update operations with timeout protection
      await Promise.race([
        this.client.collections(collectionName).documents().upsert(document),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`Document indexing timeout after 30 seconds for document ${document.id}`)
              ),
            30000
          )
        ),
      ]);
    } catch (error) {
      console.error(`Failed to index document ${document.id}:`, error);
      throw error;
    }
  }

  async bulkIndex(collectionName: string, documents: Record<string, unknown>[]): Promise<void> {
    if (documents.length === 0) return;

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(
          `Starting bulk upsert of ${documents.length} documents (attempt ${retryCount + 1}/${maxRetries})...`
        );

        // Use upsert to update existing documents or create new ones
        const response = await Promise.race([
          this.client
            .collections(collectionName)
            .documents()
            .import(documents, { action: 'upsert' }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Bulk indexing timeout after 60 seconds')), 60000)
          ),
        ]);

        const failedItems = response.filter(
          (item: Record<string, unknown>) => item.success === false
        );
        if (failedItems.length > 0) {
          console.error('Bulk indexing errors:', failedItems);
        } else {
          console.log(`✓ Bulk indexed ${documents.length} documents`);
        }

        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error(`Bulk indexing failed (attempt ${retryCount}/${maxRetries}):`, error);

        if (retryCount >= maxRetries) {
          throw error; // Give up after max retries
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  async search(
    collectionName: string,
    searchParameters: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.client
        .collections(collectionName)
        .documents()
        .search(searchParameters);
      return response;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  async deleteDocument(collectionName: string, id: string | number): Promise<void> {
    try {
      await this.client.collections(collectionName).documents(id).delete();
    } catch (error) {
      console.error(`Failed to delete document ${id}:`, error);
      throw error;
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.collections(collectionName).delete();
      console.log(`✓ Deleted collection: ${collectionName}`);
    } catch (error) {
      console.error(`Failed to delete collection ${collectionName}:`, error);
      throw error;
    }
  }

  async getCollection(collectionName: string): Promise<Record<string, unknown>> {
    try {
      const collection = await this.client.collections(collectionName).retrieve();
      return collection;
    } catch (error) {
      console.error(`Failed to get collection ${collectionName}:`, error);
      throw error;
    }
  }

  getClient(): any {
    return this.client;
  }

  isTypesenseConnected(): boolean {
    return this.isConnected;
  }
}

// Create a singleton instance
export const typesenseService = new TypesenseService();
export default typesenseService;
