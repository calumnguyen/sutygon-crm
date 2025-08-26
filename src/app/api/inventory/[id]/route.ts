import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes, inventoryTags, tags } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  encryptInventoryData,
  encryptInventorySizeData,
  encryptTagData,
} from '@/lib/utils/inventoryEncryption';
import { typesenseInventorySync } from '@/lib/typesense/sync';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';

export const PUT = withAuth(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const itemId = parseInt(id);
    const requestId = `inv-edit-${itemId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`[${requestId}] ✏️ Inventory item edit started for item ID:`, itemId);

    if (isNaN(itemId)) {
      console.error(`[${requestId}] ❌ Invalid item ID:`, id);
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    try {
      const body = await request.json();
      const { name, category, imageUrl, tags: tagNames, sizes } = body;

      console.log(`[${requestId}] 📋 Edit request data:`, {
        itemId,
        name: name ? `${name.substring(0, 20)}...` : 'null',
        category,
        hasImage: !!imageUrl,
        tagCount: tagNames?.length || 0,
        sizeCount: sizes?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Encrypt the data
      const encryptedInventoryData = encryptInventoryData({
        name,
        category,
        imageUrl,
      });

      console.log(`[${requestId}] 🔒 Encrypted inventory data prepared`);

      // Update the inventory item
      try {
        console.log(`[${requestId}] 💾 Updating inventory item...`);
        await db
          .update(inventoryItems)
          .set({
            name: encryptedInventoryData.name,
            category: encryptedInventoryData.category,
            imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, itemId));

        console.log(`[${requestId}] ✅ Inventory item updated successfully`);
      } catch (updateError) {
        console.error(`[${requestId}] ❌ Inventory item update failed:`, {
          error: updateError instanceof Error ? updateError.message : String(updateError),
          stack: updateError instanceof Error ? updateError.stack : undefined,
          itemId,
          itemData: {
            nameLength: name?.length || 0,
            categoryLength: category?.length || 0,
            hasImage: !!imageUrl,
          },
          timestamp: new Date().toISOString(),
        });
        throw new Error(
          `Inventory item update failed: ${updateError instanceof Error ? updateError.message : String(updateError)}`
        );
      }

      // Update sizes
      if (sizes && sizes.length) {
        try {
          console.log(`[${requestId}] 📏 Updating ${sizes.length} sizes...`);

          // Delete existing sizes
          await db.delete(inventorySizes).where(eq(inventorySizes.itemId, itemId));
          console.log(`[${requestId}] 🗑️ Deleted existing sizes`);

          // Insert new sizes
          const encryptedSizes = sizes.map(
            (s: { title: string; quantity: number; onHand: number; price: number }) => {
              const encryptedSize = encryptInventorySizeData({
                ...s,
                itemId: itemId,
              });
              return {
                title: encryptedSize.title,
                quantity: encryptedSize.quantity,
                onHand: encryptedSize.onHand,
                price: encryptedSize.price,
                itemId: itemId,
              };
            }
          );

          await db.insert(inventorySizes).values(encryptedSizes);
          console.log(`[${requestId}] ✅ Sizes updated successfully`);
        } catch (sizeError) {
          console.error(`[${requestId}] ❌ Size update failed:`, {
            error: sizeError instanceof Error ? sizeError.message : String(sizeError),
            stack: sizeError instanceof Error ? sizeError.stack : undefined,
            itemId,
            sizeCount: sizes.length,
            sizes: sizes.map(
              (s: { title: string; quantity: number; onHand: number; price: number }) => ({
                title: s.title,
                quantity: s.quantity,
                onHand: s.onHand,
                price: s.price,
              })
            ),
            timestamp: new Date().toISOString(),
          });
          throw new Error(
            `Size update failed: ${sizeError instanceof Error ? sizeError.message : String(sizeError)}`
          );
        }
      }

      // Update tags
      if (tagNames && tagNames.length) {
        try {
          console.log(`[${requestId}] 🏷️ Processing ${tagNames.length} tags...`);

          // Deduplicate tag names to prevent duplicate insertions
          const uniqueTagNames = [...new Set(tagNames as string[])];
          console.log(`[${requestId}] 🔍 Deduplicated to ${uniqueTagNames.length} unique tags`);

          // Delete existing tags
          await db.delete(inventoryTags).where(eq(inventoryTags.itemId, itemId));
          console.log(`[${requestId}] 🗑️ Deleted existing tag associations`);

          // Create or find tags and get their IDs
          const tagIds: number[] = [];
          for (const tagName of uniqueTagNames) {
            const encryptedTagName = encryptTagData({ name: tagName }).name;

            let [tag] = await db.select().from(tags).where(eq(tags.name, encryptedTagName));
            if (!tag) {
              console.log(`[${requestId}] 🆕 Creating new tag:`, tagName);
              [tag] = await db.insert(tags).values({ name: encryptedTagName }).returning();
            }
            tagIds.push(tag.id);
          }

          // Insert into inventory_tags using PostgreSQL UPSERT to handle conflicts gracefully
          if (tagIds.length > 0) {
            try {
              console.log(`[${requestId}] 🔗 Inserting ${tagIds.length} tag associations...`);
              // Use raw SQL for ON CONFLICT DO NOTHING since Drizzle doesn't fully support it yet
              const values = tagIds.map((tagId) => `(${itemId}, ${tagId})`).join(', ');
              const insertQuery = `
              INSERT INTO inventory_tags (item_id, tag_id) 
              VALUES ${values} 
              ON CONFLICT (item_id, tag_id) DO NOTHING
            `;

              await db.execute(sql.raw(insertQuery));
              console.log(`[${requestId}] ✅ Tags updated successfully using UPSERT`);
            } catch (upsertError) {
              console.warn(
                `[${requestId}] ⚠️ UPSERT failed, falling back to delete-insert approach:`,
                {
                  error: upsertError instanceof Error ? upsertError.message : String(upsertError),
                  itemId,
                  tagIds,
                }
              );

              // Fallback to the old delete-insert method if the raw SQL approach fails
              try {
                // Delete existing tags for this item
                await db.delete(inventoryTags).where(eq(inventoryTags.itemId, itemId));

                // Re-insert the tags
                await db.insert(inventoryTags).values(tagIds.map((tagId) => ({ itemId, tagId })));
                console.log(`[${requestId}] ✅ Tags updated successfully using fallback method`);
              } catch (fallbackError) {
                console.error(`[${requestId}] ❌ Tag update fallback also failed:`, {
                  error:
                    fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                  itemId,
                  tagIds,
                  timestamp: new Date().toISOString(),
                });
                throw new Error(
                  `Tag update failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
                );
              }
            }
          }
        } catch (tagError) {
          console.error(`[${requestId}] ❌ Tag update failed:`, {
            error: tagError instanceof Error ? tagError.message : String(tagError),
            stack: tagError instanceof Error ? tagError.stack : undefined,
            itemId,
            tagNames,
            tagCount: tagNames.length,
            timestamp: new Date().toISOString(),
          });
          throw new Error(
            `Tag update failed: ${tagError instanceof Error ? tagError.message : String(tagError)}`
          );
        }
      }

      // Sync to Typesense (async, don't wait)
      typesenseInventorySync.syncItemUpdate(itemId).catch((syncError) => {
        console.error(`[${requestId}] ❌ Typesense sync failed:`, {
          error: syncError instanceof Error ? syncError.message : String(syncError),
          itemId,
          timestamp: new Date().toISOString(),
        });
      });

      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ✅ Inventory item edit completed successfully in ${duration}ms`, {
        itemId,
        duration,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] ❌ Inventory item edit failed after ${duration}ms:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        itemId,
        duration,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
    }
  }
);

export const DELETE = withAuth(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
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

      // Sync to Typesense (async, don't wait)
      typesenseInventorySync.syncItemDelete(itemId).catch((error) => {
        console.error('Typesense sync failed for deleted item:', error);
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Delete inventory error:', error);
      return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
    }
  }
);
