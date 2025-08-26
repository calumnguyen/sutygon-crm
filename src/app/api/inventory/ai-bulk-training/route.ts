import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';
import { db } from '@/lib/db';
import { inventoryItems, tags, inventoryTags, aiTrainingData } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { decryptTagData } from '@/lib/utils/inventoryEncryption';

// Global training session state
let trainingSession = {
  isActive: false,
  startTime: null as Date | null,
  totalItems: 0,
  processedItems: 0,
  lastProcessedAt: null as Date | null,
  currentStep: 'idle' as 'idle' | 'loading' | 'processing' | 'saving' | 'completed' | 'error',
  error: null as string | null,
  logs: [] as string[],
  summary: null as Record<string, unknown> | null,
};

// Helper function to insert data with retry logic
async function insertWithRetry(
  values: {
    itemId: number;
    name: string;
    category: string;
    imageUrl: string | null;
    tags: string;
    description: string;
    isActive: boolean;
  }[],
  retries = 3
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.insert(aiTrainingData).values(values).onConflictDoNothing();
      return true;
    } catch (error) {
      console.error(`Database insert attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  return false;
}

// Helper function to add logs
function addLog(message: string) {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const logEntry = `[${timestamp}] ${message}`;
  trainingSession.logs.push(logEntry);
  console.log(logEntry);
}

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { action } = await request.json();

    if (action === 'start') {
      // Check if user is admin
      if (request.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Start bulk training session
      if (trainingSession.isActive) {
        return NextResponse.json({
          success: false,
          message: 'Phiên huấn luyện đang hoạt động',
          session: trainingSession,
        });
      }

      addLog('🚀 Bắt đầu phiên huấn luyện AI...');

      // Initialize session
      trainingSession = {
        isActive: true,
        startTime: new Date(),
        totalItems: 0,
        processedItems: 0,
        lastProcessedAt: new Date(),
        currentStep: 'loading',
        error: null,
        logs: [],
        summary: null,
      };

      // Clear old training data first
      addLog('🗑️ Xóa dữ liệu huấn luyện cũ...');
      await db.delete(aiTrainingData);
      addLog('✅ Đã xóa dữ liệu huấn luyện cũ');

      // Get total count first
      const totalCount = await db
        .select({ count: inventoryItems.id })
        .from(inventoryItems)
        .then((result) => result.length);

      trainingSession.totalItems = totalCount;
      addLog(`📦 Tổng số sản phẩm cần xử lý: ${totalCount}`);

      // Process items in smaller batches
      const BATCH_SIZE = 10; // Reduced from 50 to 10
      let processedCount = 0;
      let offset = 0;
      let hasMore = true;
      const categoriesProcessed = new Set<string>();
      let itemsWithImages = 0;
      let itemsWithTags = 0;
      let totalTags = 0;

      trainingSession.currentStep = 'processing';
      addLog('📦 Bắt đầu xử lý sản phẩm theo lô...');

      while (hasMore && trainingSession.isActive) {
        try {
          const batch = await db
            .select({
              id: inventoryItems.id,
              name: inventoryItems.name,
              category: inventoryItems.category,
              imageUrl: inventoryItems.imageUrl,
            })
            .from(inventoryItems)
            .limit(BATCH_SIZE)
            .offset(offset);

          if (batch.length === 0) {
            hasMore = false;
          } else {
            addLog(
              `🔄 Đang xử lý lô ${Math.floor(offset / BATCH_SIZE) + 1}: ${batch.length} sản phẩm...`
            );

            // Get tags for this batch
            const itemIds = batch.map((item) => item.id);
            const batchTags = await db
              .select({
                itemId: inventoryTags.itemId,
                tagName: tags.name,
              })
              .from(inventoryTags)
              .innerJoin(tags, eq(inventoryTags.tagId, tags.id))
              .where(inArray(inventoryTags.itemId, itemIds));

            // Group tags by item
            const tagsByItem = batchTags.reduce(
              (acc, tag) => {
                if (!acc[tag.itemId]) acc[tag.itemId] = [];
                acc[tag.itemId].push(decryptTagData({ name: tag.tagName }).name);
                return acc;
              },
              {} as Record<number, string[]>
            );

            // Build training data for this batch
            const batchTrainingData = batch.map((item) => {
              const itemTags = tagsByItem[item.id] || [];
              const hasImage = item.imageUrl ? 'Có hình ảnh' : 'Không có hình ảnh';
              const description = `Sản phẩm ${item.name} thuộc danh mục ${item.category}${itemTags.length > 0 ? ` với các tags: ${itemTags.join(', ')}` : ''}. ${hasImage}.`;

              // Track statistics
              categoriesProcessed.add(item.category);
              if (item.imageUrl) itemsWithImages++;
              if (itemTags.length > 0) {
                itemsWithTags++;
                totalTags += itemTags.length;
              }

              return {
                id: item.id,
                name: item.name,
                category: item.category,
                imageUrl: item.imageUrl,
                tags: itemTags,
                description,
              };
            });

            // Save this batch to database
            trainingSession.currentStep = 'saving';
            const values = batchTrainingData.map((item) => ({
              itemId: item.id,
              name: item.name,
              category: item.category,
              imageUrl: item.imageUrl,
              tags: JSON.stringify(item.tags),
              description: item.description,
              isActive: true,
            }));

            await insertWithRetry(values);

            processedCount += batch.length;
            trainingSession.processedItems = processedCount;
            trainingSession.lastProcessedAt = new Date();

            addLog(
              `💾 Đã xử lý và lưu lô ${Math.floor(offset / BATCH_SIZE) + 1}: ${processedCount}/${totalCount} sản phẩm`
            );

            offset += BATCH_SIZE;

            // Small delay to prevent overwhelming the database
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error('Error processing batch:', error);
          trainingSession.error = error instanceof Error ? error.message : 'Unknown error';
          trainingSession.currentStep = 'error';
          trainingSession.isActive = false;
          addLog(`❌ Lỗi xử lý lô: ${trainingSession.error}`);
          throw error;
        }
      }

      if (trainingSession.isActive) {
        trainingSession.currentStep = 'completed';
        trainingSession.isActive = false;

        // Create training summary
        trainingSession.summary = {
          totalItems: processedCount,
          categoriesProcessed: Array.from(categoriesProcessed),
          itemsWithImages,
          itemsWithTags,
          totalTags,
          averageTagsPerItem: itemsWithTags > 0 ? (totalTags / itemsWithTags).toFixed(1) : 0,
          imageCoverage: ((itemsWithImages / processedCount) * 100).toFixed(1) + '%',
          tagCoverage: ((itemsWithTags / processedCount) * 100).toFixed(1) + '%',
          trainingDuration: Math.round((Date.now() - trainingSession.startTime!.getTime()) / 1000),
        };

        addLog(`✅ Hoàn thành huấn luyện: ${processedCount} sản phẩm đã được xử lý`);
        addLog(`📊 Tóm tắt huấn luyện:`);
        addLog(`   - Tổng sản phẩm: ${processedCount}`);
        addLog(`   - Danh mục: ${categoriesProcessed.size}`);
        addLog(
          `   - Sản phẩm có hình: ${itemsWithImages} (${trainingSession.summary.imageCoverage})`
        );
        addLog(`   - Sản phẩm có tags: ${itemsWithTags} (${trainingSession.summary.tagCoverage})`);
        addLog(`   - Tổng tags: ${totalTags}`);
        addLog(`   - Thời gian: ${trainingSession.summary.trainingDuration} giây`);
      }

      return NextResponse.json({
        success: true,
        message: 'Phiên huấn luyện AI hoàn thành',
        session: {
          isActive: trainingSession.isActive,
          totalItems: trainingSession.totalItems,
          processedItems: trainingSession.processedItems,
          currentStep: trainingSession.currentStep,
          startTime: trainingSession.startTime,
          lastProcessedAt: trainingSession.lastProcessedAt,
          error: trainingSession.error,
          logs: trainingSession.logs,
          summary: trainingSession.summary,
        },
      });
    } else if (action === 'status') {
      // Get training session status
      return NextResponse.json({
        success: true,
        session: trainingSession,
      });
    } else if (action === 'stop') {
      // Stop training session
      trainingSession.isActive = false;
      trainingSession.currentStep = 'idle';
      addLog('🛑 Phiên huấn luyện đã dừng');

      return NextResponse.json({
        success: true,
        message: 'Phiên huấn luyện đã dừng',
        session: trainingSession,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Hành động không hợp lệ',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Bulk training error:', error);
    trainingSession.isActive = false;
    trainingSession.currentStep = 'error';
    trainingSession.error = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Huấn luyện AI thất bại',
        details: error instanceof Error ? error.message : 'Unknown error',
        session: trainingSession,
      },
      { status: 500 }
    );
  }
});
