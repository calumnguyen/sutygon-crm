import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes, inventoryTags, tags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  encryptInventoryData,
  encryptInventorySizeData,
  encryptTagData,
} from '@/lib/utils/inventoryEncryption';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, category, tags: tagNames, sizes, imageUrl } = body;

    console.log('DEBUG: PUT /api/inventory/[id] - Received data:', {
      itemId,
      name,
      category,
      imageUrl,
      hasImageUrl: !!imageUrl,
      imageUrlLength: imageUrl?.length,
    });

    // Encrypt inventory data before storing
    const encryptedInventoryData = encryptInventoryData({
      name,
      category,
    });

    // Update the inventory item
    await db
      .update(inventoryItems)
      .set({
        name: encryptedInventoryData.name,
        category: encryptedInventoryData.category,
        imageUrl: imageUrl || null, // Update imageUrl if provided
      })
      .where(eq(inventoryItems.id, itemId));

    console.log('DEBUG: PUT /api/inventory/[id] - Database update completed');

    // Delete existing sizes and tags
    await db.delete(inventorySizes).where(eq(inventorySizes.itemId, itemId));
    await db.delete(inventoryTags).where(eq(inventoryTags.itemId, itemId));

    // Insert new sizes with encrypted data
    if (sizes && sizes.length > 0) {
      const encryptedSizes = sizes.map(
        (s: { title: string; quantity: number; onHand: number; price: number }) => {
          const encryptedSize = encryptInventorySizeData({
            ...s,
            itemId,
          });
          return {
            title: encryptedSize.title,
            quantity: encryptedSize.quantity,
            onHand: encryptedSize.onHand,
            price: encryptedSize.price,
            itemId,
          };
        }
      );

      await db.insert(inventorySizes).values(encryptedSizes);
    }

    // Insert new tags
    const tagIds: number[] = [];
    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        // Encrypt tag name for lookup
        const encryptedTagName = encryptTagData({ name: tagName }).name;

        let [tag] = await db.select().from(tags).where(eq(tags.name, encryptedTagName));
        if (!tag) {
          [tag] = await db.insert(tags).values({ name: encryptedTagName }).returning();
        }
        tagIds.push(tag.id);
      }
      // Insert into inventory_tags
      await db.insert(inventoryTags).values(tagIds.map((tagId) => ({ itemId, tagId })));
    }

    return NextResponse.json({
      success: true,
      debug: {
        message: 'Database update completed',
        imageUrlLength: imageUrl?.length || 0,
        hasImageUrl: !!imageUrl,
      },
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    // Delete related records first (foreign key constraints)
    await db.delete(inventoryTags).where(eq(inventoryTags.itemId, itemId));
    await db.delete(inventorySizes).where(eq(inventorySizes.itemId, itemId));

    // Delete the inventory item
    await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete inventory error:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}
