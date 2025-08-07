import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes, inventoryTags, tags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  encryptInventoryData,
  encryptInventorySizeData,
  encryptTagData,
} from '@/lib/utils/inventoryEncryption';
import { inventorySync } from '@/lib/elasticsearch/sync';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, category, tags: tagNames, sizes, imageUrl } = body;

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

    // Sync to Elasticsearch (async, don't wait)
    inventorySync.syncItemUpdate(itemId).catch((error) => {
      console.error('Elasticsearch sync failed for updated item:', error);
    });

    return NextResponse.json({ success: true });
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

    // Sync to Elasticsearch (async, don't wait)
    inventorySync.syncItemDelete(itemId).catch((error) => {
      console.error('Elasticsearch sync failed for deleted item:', error);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete inventory error:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}
