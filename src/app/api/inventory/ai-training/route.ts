import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';
import { db } from '@/lib/db';
import { aiTrainingData } from '@/lib/db/schema';
import { eq, desc, and, ilike } from 'drizzle-orm';

// Function to check for similar training data
async function checkForSimilarTraining(description: string, category: string) {
  try {
    // Check for exact matches first
    const exactMatches = await db
      .select({ id: aiTrainingData.id, description: aiTrainingData.description })
      .from(aiTrainingData)
      .where(
        and(
          eq(aiTrainingData.isActive, true),
          eq(aiTrainingData.category, category),
          eq(aiTrainingData.description, description)
        )
      )
      .limit(1);

    if (exactMatches.length > 0) {
      return {
        isDuplicate: true,
        type: 'exact',
        existingId: exactMatches[0].id,
        message: 'Đã có dữ liệu huấn luyện giống hệt này',
      };
    }

    // Check for similar descriptions in the same category
    const similarMatches = await db
      .select({ id: aiTrainingData.id, description: aiTrainingData.description })
      .from(aiTrainingData)
      .where(
        and(
          eq(aiTrainingData.isActive, true),
          eq(aiTrainingData.category, category),
          ilike(aiTrainingData.description, `%${description.substring(0, 50)}%`)
        )
      )
      .limit(3);

    if (similarMatches.length > 0) {
      return {
        isDuplicate: true,
        type: 'similar',
        existingIds: similarMatches.map((m) => m.id),
        message: `Đã có ${similarMatches.length} dữ liệu huấn luyện tương tự trong danh mục "${category}"`,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return { isDuplicate: false };
  }
}

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string;

    if (!imageFile || !description || !category) {
      return NextResponse.json(
        {
          error: 'Missing required fields: image, description, category',
        },
        { status: 400 }
      );
    }

    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only image files are allowed.' },
        { status: 400 }
      );
    }

    // Check for duplicate training data
    const duplicateCheck = await checkForSimilarTraining(description, category);
    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        {
          error: 'Duplicate training data detected',
          details: duplicateCheck.message,
          duplicateType: duplicateCheck.type,
          existingIds: duplicateCheck.existingIds || [duplicateCheck.existingId],
        },
        { status: 409 }
      ); // 409 Conflict
    }

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64}`;

    // Parse tags
    const tagArray = tags ? tags.split(',').map((tag) => tag.trim()) : [];
    const tagsJson = JSON.stringify(tagArray);

    // Store training data in database
    const [trainingEntry] = await db
      .insert(aiTrainingData)
      .values({
        name: description.substring(0, 100), // Use first 100 chars of description as name
        category,
        imageUrl: dataUrl,
        tags: tagsJson,
        description,
        isActive: true,
      })
      .returning();

    // Get total count of active training data
    const totalCount = await db
      .select({ count: aiTrainingData.id })
      .from(aiTrainingData)
      .where(eq(aiTrainingData.isActive, true));

    return NextResponse.json({
      success: true,
      message: 'Training data added successfully',
      trainingDataSize: totalCount.length,
      entry: trainingEntry,
    });
  } catch (error) {
    console.error('AI training error:', error);
    return NextResponse.json(
      {
        error: 'Training failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const test = searchParams.get('test');

    if (test === 'add-gach-men') {
      // Add test training data with gạch men patterns
      const testData = [
        {
          itemId: 1, // You'll need to replace with actual item ID
          name: 'Áo dài gạch men truyền thống',
          category: 'Áo Dài',
          description:
            'Áo dài với hoa văn gạch men truyền thống Việt Nam, có các ô vuông với hoa văn chim hạc và hoa sen',
          tags: JSON.stringify(['gạch men', 'truyền thống', 'chim hạc', 'hoa sen']),
          imageUrl: null,
        },
      ];

      for (const data of testData) {
        await db.insert(aiTrainingData).values({
          itemId: data.itemId,
          name: data.name,
          category: data.category,
          description: data.description,
          tags: data.tags,
          imageUrl: data.imageUrl,
          isActive: true,
        });
      }

      return NextResponse.json({
        message: 'Test training data added',
        data: testData,
      });
    }

    // Get all training data
    const trainingData = await db
      .select()
      .from(aiTrainingData)
      .where(eq(aiTrainingData.isActive, true))
      .orderBy(desc(aiTrainingData.createdAt));

    return NextResponse.json({
      trainingData,
      count: trainingData.length,
    });
  } catch (error) {
    console.error('Failed to get training data:', error);
    return NextResponse.json({ error: 'Failed to get training data' }, { status: 500 });
  }
}

export const DELETE = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Check if user is admin
    if (request.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Chỉ quản trị viên mới có thể xóa dữ liệu huấn luyện' },
        { status: 403 }
      );
    }

    // Get count before deletion
    const countBefore = await db
      .select({ count: aiTrainingData.id })
      .from(aiTrainingData)
      .where(eq(aiTrainingData.isActive, true));

    // Delete all active training data
    await db.delete(aiTrainingData).where(eq(aiTrainingData.isActive, true));

    return NextResponse.json({
      success: true,
      message: 'Tất cả dữ liệu huấn luyện đã được xóa thành công',
      deletedCount: countBefore.length,
    });
  } catch (error) {
    console.error('Delete training data error:', error);
    return NextResponse.json(
      {
        error: 'Không thể xóa dữ liệu huấn luyện',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});
