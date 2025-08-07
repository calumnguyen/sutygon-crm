import { db } from '../db';
import { inventoryItems, inventorySizes } from '../db/schema';
import { desc, inArray, eq } from 'drizzle-orm';
import { decryptInventoryData, decryptInventorySizeData } from '../utils/inventoryEncryption';
import elasticsearchService from './index';

const INVENTORY_INDEX = 'inventory_items';

export interface IndexedInventoryItem {
  id: number;
  formattedId: string;
  name: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  sizes: Array<{
    title: string;
    quantity: number;
    onHand: number;
    price: number;
  }>;
}

class InventoryIndexer {
  private indexName = INVENTORY_INDEX;

  async initialize(): Promise<void> {
    console.log('🔄 Initializing Elasticsearch indexer...');

    // Connect to Elasticsearch
    const connected = await elasticsearchService.connect();
    if (!connected) {
      throw new Error('Failed to connect to Elasticsearch');
    }

    // Create index if it doesn't exist
    await elasticsearchService.ensureIndexExists(this.indexName);
  }

  async indexAllItems(): Promise<void> {
    console.log('🔄 Starting full re-index of inventory items...');

    try {
      // Get all items from database in batches
      const BATCH_SIZE = 100;
      let offset = 0;
      let totalIndexed = 0;

      while (true) {
        console.log(`📦 Processing batch starting at offset ${offset}...`);

        // Get items from database
        const items = await db
          .select()
          .from(inventoryItems)
          .orderBy(desc(inventoryItems.createdAt))
          .limit(BATCH_SIZE)
          .offset(offset);

        if (items.length === 0) {
          break; // No more items
        }

        // Get sizes for these items
        const itemIds = items.map((item) => item.id);
        const sizes = await db
          .select()
          .from(inventorySizes)
          .where(inArray(inventorySizes.itemId, itemIds));

        // Process and index items
        const documentsToIndex: Array<{ id: string; doc: IndexedInventoryItem }> = [];

        for (const item of items) {
          try {
            // Decrypt item data
            const decryptedItem = decryptInventoryData(item);

            // Get sizes for this item
            const itemSizes = sizes.filter((size) => size.itemId === item.id);
            const decryptedSizes = itemSizes.map((size) => decryptInventorySizeData(size));

            // Generate formatted ID based on category and counter
            const categoryPrefix = decryptedItem.category.substring(0, 2).toUpperCase();
            const formattedId = `${categoryPrefix}-${item.categoryCounter.toString().padStart(6, '0')}`;

            // Create search document
            const searchDoc: IndexedInventoryItem = {
              id: item.id,
              formattedId: formattedId,
              name: decryptedItem.name,
              category: decryptedItem.category,
              tags: [], // Tags are stored separately in a different table
              createdAt: item.createdAt.toISOString(),
              updatedAt: item.updatedAt.toISOString(),
              sizes: decryptedSizes.map((size) => ({
                title: size.title,
                quantity: size.quantity,
                onHand: size.onHand,
                price: size.price,
              })),
            };

            documentsToIndex.push({
              id: item.id.toString(),
              doc: searchDoc,
            });
          } catch (error) {
            console.error(`Failed to process item ${item.id}:`, error);
            // Continue with other items
          }
        }

        // Bulk index this batch
        if (documentsToIndex.length > 0) {
          await elasticsearchService.bulkIndex(
            this.indexName,
            documentsToIndex as unknown as Array<{ id: string; doc: Record<string, unknown> }>
          );
          totalIndexed += documentsToIndex.length;
        }

        offset += BATCH_SIZE;

        // Add a small delay to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(`✅ Successfully indexed ${totalIndexed} inventory items`);
    } catch (error) {
      console.error('❌ Failed to index inventory items:', error);
      throw error;
    }
  }

  async indexSingleItem(itemId: number): Promise<void> {
    try {
      // Get item from database
      const items = await db
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, itemId))
        .limit(1);

      if (items.length === 0) {
        throw new Error(`Item with id ${itemId} not found`);
      }

      const item = items[0];

      // Get sizes for this item
      const sizes = await db.select().from(inventorySizes).where(eq(inventorySizes.itemId, itemId));

      // Decrypt and prepare document
      const decryptedItem = decryptInventoryData(item);
      const decryptedSizes = sizes.map((size) => decryptInventorySizeData(size));

      // Generate formatted ID based on category and counter
      const categoryPrefix = decryptedItem.category.substring(0, 2).toUpperCase();
      const formattedId = `${categoryPrefix}-${item.categoryCounter.toString().padStart(6, '0')}`;

      const searchDoc: IndexedInventoryItem = {
        id: item.id,
        formattedId: formattedId,
        name: decryptedItem.name,
        category: decryptedItem.category,
        tags: [], // Tags are stored separately in a different table
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        sizes: decryptedSizes.map((size) => ({
          title: size.title,
          quantity: size.quantity,
          onHand: size.onHand,
          price: size.price,
        })),
      };

      // Index the item
      await elasticsearchService.indexDocument(
        this.indexName,
        item.id.toString(),
        searchDoc as unknown as Record<string, unknown>
      );
      console.log(`✅ Indexed item ${itemId}`);
    } catch (error) {
      console.error(`❌ Failed to index item ${itemId}:`, error);
      throw error;
    }
  }

  async deleteItem(itemId: number): Promise<void> {
    try {
      await elasticsearchService.deleteDocument(this.indexName, itemId.toString());
      console.log(`✅ Deleted item ${itemId} from search index`);
    } catch (error) {
      console.error(`❌ Failed to delete item ${itemId} from search index:`, error);
      throw error;
    }
  }

  async recreateIndex(): Promise<void> {
    console.log('🔄 Recreating search index...');

    try {
      // Delete existing index
      await elasticsearchService.deleteIndex(this.indexName);
    } catch (error) {
      // Index might not exist, that's okay
    }

    // Create fresh index
    await elasticsearchService.ensureIndexExists(this.indexName);

    // Re-index all items
    await this.indexAllItems();
  }

  getIndexName(): string {
    return this.indexName;
  }
}

// Create singleton instance
export const inventoryIndexer = new InventoryIndexer();
export default inventoryIndexer;
