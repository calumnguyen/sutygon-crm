/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '../db';
import { inventoryItems, inventorySizes, inventoryTags, tags, aiTrainingData } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  decryptInventoryData,
  decryptInventorySizeData,
  decryptTagData,
} from '../utils/inventoryEncryption';
import typesenseService from './index';

// Function to normalize Vietnamese text (remove diacritics)
function normalizeVietnameseText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[đ]/g, 'd') // Replace đ with d
    .replace(/[Đ]/g, 'D'); // Replace Đ with D
}

// Function to extract Vietnamese patterns from text
function extractVietnamesePatterns(text: string): string[] {
  const patterns: string[] = [];
  const lowerText = text.toLowerCase();

  // High-priority Vietnamese cultural patterns
  const highPriorityPatterns = [
    'gạch men',
    'hoa sen',
    'chim hạc',
    'chữ thọ',
    'tứ linh',
    'tứ quý',
    'bát bửu',
    'phượng hoàng',
    'rồng',
    'lân',
    'hoa mai',
    'hoa đào',
    'hoa cúc',
    'hoa lan',
    'hoa hồng',
    'hoa huệ',
    'hoa ly',
    'mẫu đơn',
    'kẻ ô',
    'ô vuông',
    'hình vuông',
    'song long',
    'long phụng',
    'ngũ phúc',
    'bát tiên',
    'chữ phúc',
    'chữ lộc',
    'chữ khang',
  ];

  // Check for high-priority patterns first
  for (const pattern of highPriorityPatterns) {
    if (lowerText.includes(pattern)) {
      patterns.push(pattern);
    }
  }

  return patterns.slice(0, 10); // Limit to top 10 patterns
}

const INVENTORY_COLLECTION = 'inventory_items';

export interface SyncInventoryItem {
  id: string;
  formattedId: string;
  name: string;
  nameNormalized?: string;
  category: string;
  categoryNormalized?: string;
  categoryCounter: number;
  imageUrl?: string | null;
  tags: string[];
  description?: string;
  patterns?: string[];
  createdAt: number;
  updatedAt: number;
  sizes: Array<{
    title: string;
    quantity: number;
    onHand: number;
    price: number;
  }>;
  [key: string]: unknown;
}

class TypesenseInventorySync {
  private isTypesenseAvailable = true;

  private async checkTypesense(): Promise<boolean> {
    try {
      if (!typesenseService.isTypesenseConnected()) {
        const connected = await typesenseService.connect();
        this.isTypesenseAvailable = connected;
        return connected;
      }
      return true;
    } catch (error) {
      console.warn(
        'Typesense not available, skipping sync:',
        error instanceof Error ? error.message : String(error)
      );
      this.isTypesenseAvailable = false;
      return false;
    }
  }

  async syncItemCreate(itemId: number): Promise<void> {
    if (!(await this.checkTypesense())) {
      return;
    }

    try {
      const doc = await this.buildItemDocument(itemId);
      if (doc) {
        // Add timeout protection for individual document indexing
        await Promise.race([
          typesenseService.indexDocument(INVENTORY_COLLECTION, doc),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(new Error(`Document indexing timeout after 30 seconds for item ${itemId}`)),
              30000
            )
          ),
        ]);
      }
    } catch (error) {
      console.error(`Failed to sync new item ${itemId}:`, error);
      // Don't throw - we don't want to break the main operation
    }
  }

  async syncItemUpdate(itemId: number): Promise<void> {
    if (!(await this.checkTypesense())) {
      return;
    }

    try {
      const doc = await this.buildItemDocument(itemId);
      if (doc) {
        // Typesense automatically updates if document exists
        // Add timeout protection for individual document indexing
        await Promise.race([
          typesenseService.indexDocument(INVENTORY_COLLECTION, doc),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(new Error(`Document indexing timeout after 30 seconds for item ${itemId}`)),
              30000
            )
          ),
        ]);
      }
    } catch (error) {
      console.error(`Failed to sync updated item ${itemId}:`, error);
      // Don't throw - we don't want to break the main operation
    }
  }

  async syncItemDelete(itemId: number): Promise<void> {
    if (!(await this.checkTypesense())) {
      return;
    }

    try {
      await typesenseService.deleteDocument(INVENTORY_COLLECTION, itemId.toString());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // If item doesn't exist in Typesense, that's okay - just ignore
      if (!errorMessage.includes('not_found') && !errorMessage.includes('404')) {
        console.error(`Failed to remove deleted item ${itemId} from Typesense:`, error);
      }
      // Don't throw - we don't want to break the main operation
    }
  }

  async syncMultipleItems(
    itemIds: number[],
    onProgress?: (current: number, total: number) => void,
    onLog?: (log: string) => void
  ): Promise<{ synced: number; failed: number; total: number }> {
    if (!(await this.checkTypesense())) {
      console.log(`⚠️ Skipping bulk sync for ${itemIds.length} items - Typesense unavailable`);
      return { synced: 0, failed: itemIds.length, total: itemIds.length };
    }

    try {
      const startLog = `🔄 Bắt đầu đồng bộ hàng loạt ${itemIds.length} sản phẩm với Typesense...`;
      console.log(startLog);
      if (onLog) onLog(startLog);

      // Send initial progress update
      if (onProgress) {
        onProgress(0, itemIds.length);
      }

      // Fetch all data in bulk with batching to avoid PostgreSQL parameter limit
      if (onLog) onLog('🔍 Đang tải dữ liệu từ cơ sở dữ liệu...');

      const allItems: any[] = [],
        allSizes: any[] = [],
        allTags: any[] = [];
      const BATCH_SIZE = 500; // Use smaller batches to be extra safe with PostgreSQL

      try {
        // Fetch items in batches
        for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
          const batch = itemIds.slice(i, i + BATCH_SIZE);
          const [batchItems, batchSizes, batchTags] = await Promise.all([
            db.select().from(inventoryItems).where(inArray(inventoryItems.id, batch)),
            db.select().from(inventorySizes).where(inArray(inventorySizes.itemId, batch)),
            db
              .select({
                itemId: inventoryTags.itemId,
                tagName: tags.name,
              })
              .from(inventoryTags)
              .innerJoin(tags, eq(inventoryTags.tagId, tags.id))
              .where(inArray(inventoryTags.itemId, batch)),
          ]);

          allItems.push(...batchItems);
          allSizes.push(...batchSizes);
          allTags.push(...batchTags);

          if (onLog)
            onLog(
              `📊 Đã tải lô ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(itemIds.length / BATCH_SIZE)}`
            );
        }

        const fetchLog = `📊 Đã tải ${allItems.length} sản phẩm, ${allSizes.length} kích thước, ${allTags.length} nhãn`;
        console.log(fetchLog);
        if (onLog) onLog(fetchLog);

        if (onLog) onLog('🔍 Đang tạo bản đồ tra cứu...');
      } catch (dbError) {
        const errorLog = `❌ Truy vấn cơ sở dữ liệu thất bại: ${dbError instanceof Error ? dbError.message : String(dbError)}`;
        console.error(errorLog);
        if (onLog) onLog(errorLog);
        throw dbError;
      }

      // Create lookup maps for efficient access
      const sizesByItemId = allSizes.reduce(
        (acc: Record<number, any[]>, size: any) => {
          if (!acc[size.itemId]) acc[size.itemId] = [];
          acc[size.itemId].push(size);
          return acc;
        },
        {} as Record<number, any[]>
      );

      const tagsByItemId = allTags.reduce(
        (acc: Record<number, string[]>, item: any) => {
          const decryptedTagName = decryptTagData({ name: item.tagName }).name;
          if (!acc[item.itemId]) acc[item.itemId] = [];
          acc[item.itemId].push(decryptedTagName);
          return acc;
        },
        {} as Record<number, string[]>
      );

      if (onLog) onLog('🔍 Đang xây dựng tài liệu...');

      // Build documents efficiently
      const documents: SyncInventoryItem[] = [];
      const failedItems: number[] = [];
      let processedCount = 0;

      for (const item of allItems) {
        // Log the first item being processed
        if (processedCount === 0 && onLog) {
          onLog(`🔍 Đang xử lý sản phẩm đầu tiên: ${item.id}`);
        }

        const doc = await this.buildItemDocumentFromData(
          item,
          sizesByItemId[item.id] || [],
          tagsByItemId[item.id] || [],
          onLog
        );

        if (doc) {
          documents.push(doc);
        } else {
          failedItems.push(item.id);
          // Log first few failures to debug
          if (failedItems.length <= 3) {
            const failLog = `❌ Không thể xây dựng tài liệu cho sản phẩm ${item.id}`;
            console.error(failLog);
            if (onLog) onLog(failLog);
          }

          // Log the first failure with more detail
          if (failedItems.length === 1 && onLog) {
            onLog(`🔍 Lỗi đầu tiên - đang kiểm tra cấu trúc dữ liệu sản phẩm ${item.id}...`);
          }
        }

        processedCount++;

        // Report progress every 50 items for more frequent updates
        if (processedCount % 50 === 0 || processedCount === allItems.length) {
          if (onProgress) {
            // During building phase, show progress as 30% of total (building phase is faster)
            const buildingProgress = Math.round((processedCount / itemIds.length) * 30);
            onProgress(buildingProgress, 100);
          }
          const progressLog = `📊 Tiến độ: ${processedCount}/${itemIds.length} sản phẩm đã xử lý (${documents.length} thành công, ${failedItems.length} thất bại)`;
          console.log(progressLog);
          if (onLog) onLog(progressLog);
        }
      }

      if (documents.length > 0) {
        const indexLog = `📤 Đang lập chỉ mục ${documents.length} tài liệu vào Typesense...`;
        console.log(indexLog);
        if (onLog) onLog(indexLog);

        // Send progress update to indicate indexing phase has started
        if (onProgress) {
          onProgress(30, 100); // 30% - building phase complete, indexing starting
        }

        try {
          // Split into smaller chunks to avoid timeouts
          const CHUNK_SIZE = 100;
          let totalSynced = 0;

          for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
            const chunk = documents.slice(i, i + CHUNK_SIZE);
            const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
            const totalChunks = Math.ceil(documents.length / CHUNK_SIZE);

            if (onLog)
              onLog(
                `📤 Đang lập chỉ mục phần ${chunkNumber}/${totalChunks} (${chunk.length} tài liệu)...`
              );

            await typesenseService.bulkIndex(INVENTORY_COLLECTION, chunk);
            totalSynced += chunk.length;

            // Report progress during indexing phase
            if (onProgress) {
              // During indexing, show progress as 30% (building) + 70% (indexing)
              const indexingProgress = Math.round((totalSynced / documents.length) * 70);
              const totalProgress = 30 + indexingProgress;
              onProgress(totalProgress, 100);
            }

            if (onLog)
              onLog(
                `✅ Phần ${chunkNumber}/${totalChunks} hoàn thành (${totalSynced}/${documents.length} tổng cộng)`
              );
          }

          // Only log success after ALL chunks are complete
          const successLog = `✅ Đã đồng bộ thành công ${totalSynced} sản phẩm với Typesense`;
          console.log(successLog);
          if (onLog) onLog(successLog);

          // Return success after all chunks are complete
          return { synced: totalSynced, failed: 0, total: itemIds.length };
        } catch (indexError: any) {
          console.error('Typesense indexing error:', indexError);

          if (indexError.importResults) {
            const failedDocs = indexError.importResults.filter((result: any) => !result.success);
            const successCount = indexError.importResults.filter(
              (result: any) => result.success
            ).length;

            const errorLog = `❌ Nhập dữ liệu Typesense thất bại: ${successCount} thành công, ${failedDocs.length} thất bại`;
            console.error(errorLog);
            if (onLog) onLog(errorLog);

            // Log first few specific errors
            if (failedDocs.length > 0 && onLog) {
              onLog(`🔍 Một số lỗi đầu tiên:`);
              failedDocs.slice(0, 3).forEach((doc: any, index: number) => {
                onLog(`  ${index + 1}. Tài liệu ${doc.document}: ${doc.error}`);
              });
            }
          } else {
            const errorLog = `❌ Lập chỉ mục Typesense thất bại: ${indexError.message}`;
            console.error(errorLog);
            if (onLog) onLog(errorLog);
          }

          // Return partial success
          const successCount = indexError.importResults
            ? indexError.importResults.filter((result: any) => result.success).length
            : 0;

          return {
            synced: successCount,
            failed: documents.length - successCount,
            total: itemIds.length,
          };
        }

        if (failedItems.length > 0) {
          const failLog = `⚠️ Không thể xây dựng ${failedItems.length} sản phẩm: ${failedItems.slice(0, 5).join(', ')}${failedItems.length > 5 ? '...' : ''}`;
          console.warn(failLog);
          onLog?.(failLog);
        }
      } else {
        const noDocsLog = `ℹ️ Không có tài liệu nào để đồng bộ`;
        console.log(noDocsLog);
        onLog?.(noDocsLog);
      }

      return { synced: documents.length, failed: failedItems.length, total: itemIds.length };
    } catch (error) {
      console.error(
        `❌ Failed to bulk sync items:`,
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - we don't want to break the main operation
      return { synced: 0, failed: itemIds.length, total: itemIds.length };
    }
  }

  private async buildItemDocumentFromData(
    item: any,
    sizes: Array<{
      id: number;
      itemId: number;
      title: string;
      quantity: string;
      onHand: string;
      price: string;
    }>,
    itemTags: string[],
    onLog?: (log: string) => void
  ): Promise<SyncInventoryItem | null> {
    try {
      // Decrypt data
      const decryptedItem = decryptInventoryData(item);
      const decryptedSizes = sizes.map((size) => decryptInventorySizeData(size));

      // Get training data for this item
      let trainingDescription = '';
      let trainingPatterns: string[] = [];

      try {
        const trainingData = await db
          .select({
            description: aiTrainingData.description,
            tags: aiTrainingData.tags,
          })
          .from(aiTrainingData)
          .where(eq(aiTrainingData.itemId, item.id))
          .limit(1);

        if (trainingData.length > 0) {
          trainingDescription = trainingData[0].description || '';
          if (trainingData[0].tags) {
            const tags = JSON.parse(trainingData[0].tags);
            trainingPatterns = extractVietnamesePatterns(
              trainingDescription + ' ' + tags.join(' ')
            );
          } else {
            trainingPatterns = extractVietnamesePatterns(trainingDescription);
          }
        }
      } catch (error) {
        console.warn(`Failed to get training data for item ${item.id}:`, error);
      }

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

      // Build document for Typesense
      const doc: SyncInventoryItem = {
        id: item.id.toString(),
        formattedId: formattedId,
        name: decryptedItem.name,
        nameNormalized: normalizeVietnameseText(decryptedItem.name),
        category: decryptedItem.category,
        categoryNormalized: normalizeVietnameseText(decryptedItem.category),
        categoryCounter: item.categoryCounter, // Add category counter for sorting
        imageUrl: item.imageUrl ? 'has_image' : null,
        tags: itemTags,
        description: trainingDescription,
        patterns: trainingPatterns,
        createdAt: new Date(item.createdAt).getTime(),
        updatedAt: new Date(item.updatedAt).getTime(),
        sizes: decryptedSizes.map((size) => ({
          title: size.title,
          quantity: size.quantity,
          onHand: size.onHand,
          price: size.price,
        })),
      };

      return doc;
    } catch (error) {
      console.error(`Failed to build document for item ${item.id}:`, error);
      console.error('Item data:', { id: item.id, name: item.name, category: item.category });

      // Add more detailed error info to the log callback
      if (onLog) {
        onLog(
          `❌ Item ${item.id} failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      return null;
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
          // If tags fail, continue with empty tags rather than failing the entire sync
          sizes = await db.select().from(inventorySizes).where(eq(inventorySizes.itemId, itemId));
          itemTags = [];
        }

        // Decrypt data
        const decryptedItem = decryptInventoryData(item);
        const decryptedSizes = sizes.map((size) => decryptInventorySizeData(size));
        const decryptedTags = itemTags.map((tag) => decryptTagData({ name: tag.tagName }).name);

        // Get training data for this item
        let trainingDescription = '';
        let trainingPatterns: string[] = [];

        try {
          const trainingData = await db
            .select({
              description: aiTrainingData.description,
              tags: aiTrainingData.tags,
            })
            .from(aiTrainingData)
            .where(eq(aiTrainingData.itemId, itemId))
            .limit(1);

          if (trainingData.length > 0) {
            trainingDescription = trainingData[0].description || '';
            if (trainingData[0].tags) {
              const tags = JSON.parse(trainingData[0].tags);
              trainingPatterns = extractVietnamesePatterns(
                trainingDescription + ' ' + tags.join(' ')
              );
            } else {
              trainingPatterns = extractVietnamesePatterns(trainingDescription);
            }
          }
        } catch (error) {
          console.warn(`Failed to get training data for item ${itemId}:`, error);
        }

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

        // Build document for Typesense
        const doc: SyncInventoryItem = {
          id: item.id.toString(),
          formattedId: formattedId,
          name: decryptedItem.name,
          nameNormalized: normalizeVietnameseText(decryptedItem.name),
          category: decryptedItem.category,
          categoryNormalized: normalizeVietnameseText(decryptedItem.category),
          categoryCounter: item.categoryCounter, // Add category counter for sorting
          imageUrl: item.imageUrl ? 'has_image' : null, // Only store reference, not full base64 data
          tags: decryptedTags,
          description: trainingDescription,
          patterns: trainingPatterns,
          createdAt: new Date(item.createdAt).getTime(),
          updatedAt: new Date(item.updatedAt).getTime(),
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
   * Check if an item exists in Typesense
   */
  async itemExistsInSearch(itemId: number): Promise<boolean> {
    if (!(await this.checkTypesense())) {
      return false;
    }

    try {
      const response = await typesenseService.search(INVENTORY_COLLECTION, {
        q: itemId.toString(),
        query_by: 'id',
        per_page: 1,
      });
      return ((response.hits as unknown[])?.length || 0) > 0;
    } catch (error) {
      console.error(`Failed to check if item ${itemId} exists in search:`, error);
      return false;
    }
  }
}

// Create singleton instance
export const typesenseInventorySync = new TypesenseInventorySync();
export default typesenseInventorySync;
