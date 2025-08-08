import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes, inventoryTags, tags } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
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
    console.log(
      `[Inventory Update] Starting update for item ${itemId} with ${tagNames?.length || 0} tags`
    );

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

      // Insert sizes with robust race condition handling
      let sizesInsertSuccess = false;
      let sizesAttempts = 0;
      const maxSizesAttempts = 2;

      while (!sizesInsertSuccess && sizesAttempts < maxSizesAttempts) {
        sizesAttempts++;
        try {
          await db.insert(inventorySizes).values(encryptedSizes);
          sizesInsertSuccess = true;
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            console.log(
              `Race condition detected for inventory_sizes (attempt ${sizesAttempts}), cleaning up and retrying...`
            );

            // Delete old inventory_sizes again (another request might have added some)
            await db.delete(inventorySizes).where(eq(inventorySizes.itemId, itemId));

            if (sizesAttempts >= maxSizesAttempts) {
              // Final attempt
              await db.insert(inventorySizes).values(encryptedSizes);
              sizesInsertSuccess = true;
            }
          } else {
            throw error; // Re-throw other errors
          }
        }
      }
    }

    // Insert new tags with race condition handling
    const tagIds: number[] = [];
    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        // Encrypt tag name for lookup
        const encryptedTagName = encryptTagData({ name: tagName }).name;

        let [tag] = await db.select().from(tags).where(eq(tags.name, encryptedTagName));
        if (!tag) {
          try {
            // Try to insert new tag
            [tag] = await db.insert(tags).values({ name: encryptedTagName }).returning();
          } catch (error: unknown) {
            // If duplicate key error (race condition), query again
            if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
              console.log('Race condition detected for tag creation, querying again...');
              [tag] = await db.select().from(tags).where(eq(tags.name, encryptedTagName));
              if (!tag) {
                throw new Error('Failed to create or find tag after race condition');
              }
            } else {
              throw error; // Re-throw other errors
            }
          }
        }
        tagIds.push(tag.id);
      }

      // Insert into inventory_tags using PostgreSQL UPSERT to handle conflicts gracefully
      if (tagIds.length > 0) {
        try {
          // Use raw SQL for ON CONFLICT DO NOTHING since Drizzle doesn't fully support it yet
          const values = tagIds.map((tagId) => `(${itemId}, ${tagId})`).join(', ');
          const insertQuery = `
            INSERT INTO inventory_tags (item_id, tag_id) 
            VALUES ${values} 
            ON CONFLICT (item_id, tag_id) DO NOTHING
          `;

          await db.execute(sql.raw(insertQuery));
          console.log(
            `[Inventory Update] Successfully upserted ${tagIds.length} tags for item ${itemId}`
          );
        } catch (error: unknown) {
          // Fallback to the old delete-insert method if the raw SQL approach fails
          console.log(
            '[Inventory Update] UPSERT failed, falling back to delete-insert approach...'
          );

          // Delete existing tags for this item
          await db.delete(inventoryTags).where(eq(inventoryTags.itemId, itemId));

          // Re-insert the tags
          await db.insert(inventoryTags).values(tagIds.map((tagId) => ({ itemId, tagId })));
          console.log(
            `[Inventory Update] Fallback: Successfully inserted ${tagIds.length} tags for item ${itemId}`
          );
        }
      }
    }

    // Sync to Elasticsearch (async, don't wait)
    inventorySync.syncItemUpdate(itemId).catch((error) => {
      console.error('Elasticsearch sync failed for updated item:', error);
    });

    console.log(`[Inventory Update] Successfully updated item ${itemId}`);
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
