import { db } from '../db';
import { inventoryItems, inventorySizes, inventoryTags, tags } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  decryptInventoryData,
  decryptInventorySizeData,
  decryptTagData,
} from '../utils/inventoryEncryption';
import elasticsearchService from './index';

const INVENTORY_INDEX = 'inventory_items';

export interface SyncInventoryItem {
  id: number;
  formattedId: string;
  name: string;
  category: string;
  imageUrl?: string | null; // Optional - excluded from Elasticsearch due to size limits
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

class InventorySync {
  private isElasticsearchAvailable = true;

  private async checkElasticsearch(): Promise<boolean> {
    try {
      if (!elasticsearchService.isElasticsearchConnected()) {
        const connected = await elasticsearchService.connect();
        this.isElasticsearchAvailable = connected;
        return connected;
      }
      return true;
    } catch (error) {
      console.warn(
        'Elasticsearch not available, skipping sync:',
        error instanceof Error ? error.message : String(error)
      );
      this.isElasticsearchAvailable = false;
      return false;
    }
  }

  async syncItemCreate(itemId: number): Promise<void> {
    if (!(await this.checkElasticsearch())) {
      console.log(`⚠️ Skipping sync for new item ${itemId} - Elasticsearch unavailable`);
      return;
    }

    try {
      console.log(`🔄 Syncing new item ${itemId} to Elasticsearch...`);
      const doc = await this.buildItemDocument(itemId);
      if (doc) {
        await elasticsearchService.indexDocument(
          INVENTORY_INDEX,
          itemId.toString(),
          doc as unknown as Record<string, unknown>
        );
        console.log(`✅ Synced new item ${itemId} to Elasticsearch`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to sync new item ${itemId}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - we don't want to break the main operation
    }
  }

  async syncItemUpdate(itemId: number): Promise<void> {
    if (!(await this.checkElasticsearch())) {
      console.log(`⚠️ Skipping sync for updated item ${itemId} - Elasticsearch unavailable`);
      return;
    }

    try {
      console.log(`🔄 Syncing updated item ${itemId} to Elasticsearch...`);
      const doc = await this.buildItemDocument(itemId);
      if (doc) {
        await elasticsearchService.indexDocument(
          INVENTORY_INDEX,
          itemId.toString(),
          doc as unknown as Record<string, unknown>
        );
        console.log(`✅ Synced updated item ${itemId} to Elasticsearch`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to sync updated item ${itemId}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - we don't want to break the main operation
    }
  }

  async syncItemDelete(itemId: number): Promise<void> {
    if (!(await this.checkElasticsearch())) {
      console.log(`⚠️ Skipping sync for deleted item ${itemId} - Elasticsearch unavailable`);
      return;
    }

    try {
      console.log(`🔄 Removing deleted item ${itemId} from Elasticsearch...`);
      await elasticsearchService.deleteDocument(INVENTORY_INDEX, itemId.toString());
      console.log(`✅ Removed deleted item ${itemId} from Elasticsearch`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // If item doesn't exist in Elasticsearch, that's okay
      if (errorMessage.includes('not_found')) {
        console.log(`✅ Item ${itemId} was not in Elasticsearch (already removed)`);
      } else {
        console.error(
          `❌ Failed to remove deleted item ${itemId} from Elasticsearch:`,
          errorMessage
        );
      }
      // Don't throw - we don't want to break the main operation
    }
  }

  async syncMultipleItems(itemIds: number[]): Promise<void> {
    if (!(await this.checkElasticsearch())) {
      console.log(`⚠️ Skipping bulk sync for ${itemIds.length} items - Elasticsearch unavailable`);
      return;
    }

    try {
      console.log(`🔄 Bulk syncing ${itemIds.length} items to Elasticsearch...`);
      const documents: Array<{ id: string; doc: SyncInventoryItem }> = [];

      for (const itemId of itemIds) {
        const doc = await this.buildItemDocument(itemId);
        if (doc) {
          documents.push({
            id: itemId.toString(),
            doc,
          });
        }
      }

      if (documents.length > 0) {
        await elasticsearchService.bulkIndex(
          INVENTORY_INDEX,
          documents as unknown as Array<{ id: string; doc: Record<string, unknown> }>
        );
        console.log(`✅ Bulk synced ${documents.length} items to Elasticsearch`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to bulk sync items:`,
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - we don't want to break the main operation
    }
  }

  private async buildItemDocument(itemId: number): Promise<SyncInventoryItem | null> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Get the item from database
        const items = await db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, itemId))
          .limit(1);

        if (items.length === 0) {
          console.warn(`Item ${itemId} not found in database`);
          return null;
        }

        const item = items[0];

        // Get sizes and tags for this item with retry logic
        let sizes: Array<{
          id: number;
          itemId: number;
          title: string;
          quantity: string;
          onHand: string;
          price: string;
        }>;
        let itemTags: Array<{ tagName: string }>;
        try {
          [sizes, itemTags] = await Promise.all([
            db.select().from(inventorySizes).where(eq(inventorySizes.itemId, itemId)),
            db
              .select({
                tagName: tags.name,
              })
              .from(inventoryTags)
              .innerJoin(tags, eq(inventoryTags.tagId, tags.id))
              .where(eq(inventoryTags.itemId, itemId)),
          ]);
        } catch (tagError) {
          console.warn(
            `Failed to fetch tags for item ${itemId} (attempt ${retryCount + 1}):`,
            tagError
          );
          // If tags fail, continue with empty tags rather than failing the entire sync
          sizes = await db.select().from(inventorySizes).where(eq(inventorySizes.itemId, itemId));
          itemTags = [];
        }

        // Decrypt data
        const decryptedItem = decryptInventoryData(item);
        const decryptedSizes = sizes.map((size) => decryptInventorySizeData(size));
        const decryptedTags = itemTags.map((tag) => decryptTagData({ name: tag.tagName }).name);

        // Category code mapping for consistent IDs
        const CATEGORY_CODE_MAP: Record<string, string> = {
          'Áo Dài': 'AD',
          Áo: 'AO',
          Quần: 'QU',
          'Văn Nghệ': 'VN',
          'Đồ Tây': 'DT',
          Giầy: 'GI',
          'Dụng Cụ': 'DC',
          'Đầm Dạ Hội': 'DH',
        };

        // Generate formatted ID using same logic as API routes
        function getFormattedId(category: string, categoryCounter: number) {
          let code = CATEGORY_CODE_MAP[category];
          if (!code) {
            // Fallback for unknown categories - generate from first letters
            code = (category || 'XX')
              .split(' ')
              .map((w: string) => w[0])
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

        const formattedId = getFormattedId(decryptedItem.category, item.categoryCounter);

        // Build document (excluding imageUrl to avoid Elasticsearch size limits)
        const doc: SyncInventoryItem = {
          id: item.id,
          formattedId: formattedId,
          name: decryptedItem.name,
          category: decryptedItem.category,
          // imageUrl: item.imageUrl, // Excluded - too large for Elasticsearch
          tags: decryptedTags,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          sizes: decryptedSizes.map((size) => ({
            title: size.title,
            quantity: size.quantity,
            onHand: size.onHand,
            price: size.price,
          })),
        };

        return doc;
      } catch (error) {
        retryCount++;
        console.error(
          `Failed to build document for item ${itemId} (attempt ${retryCount}/${maxRetries}):`,
          error
        );

        // If it's a connection error and we haven't exhausted retries, wait and retry
        if (
          retryCount < maxRetries &&
          error instanceof Error &&
          (error.message.includes('connection') ||
            error.message.includes('timeout') ||
            error.message.includes('fetch failed') ||
            error.message.includes('other side closed'))
        ) {
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        // If we've exhausted retries or it's not a connection error, return null
        console.error(`Failed to build document for item ${itemId} after ${maxRetries} attempts`);
        return null;
      }
    }

    return null;
  }

  /**
   * Force re-sync of specific items (useful for debugging or manual fixes)
   */
  async forceSyncItems(itemIds: number[]): Promise<void> {
    console.log(`🔄 Force syncing ${itemIds.length} items...`);
    await this.syncMultipleItems(itemIds);
  }

  /**
   * Check if an item exists in Elasticsearch
   */
  async itemExistsInSearch(itemId: number): Promise<boolean> {
    if (!(await this.checkElasticsearch())) {
      return false;
    }

    try {
      const response = await elasticsearchService.search(INVENTORY_INDEX, {
        query: {
          term: { id: itemId },
        },
        size: 1,
      });
      const esResponse = response as { hits?: { hits?: unknown[] } };
      return (esResponse?.hits?.hits?.length || 0) > 0;
    } catch (error) {
      console.error(`Failed to check if item ${itemId} exists in search:`, error);
      return false;
    }
  }
}

// Create singleton instance
export const inventorySync = new InventorySync();
export default inventorySync;
