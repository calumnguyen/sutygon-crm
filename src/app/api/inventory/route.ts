import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  inventoryItems,
  inventorySizes,
  tags,
  inventoryTags,
  categoryCounters,
} from '@/lib/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import {
  encryptInventoryData,
  decryptInventoryData,
  encryptInventorySizeData,
  decryptInventorySizeData,
  encryptTagData,
  decryptTagData,
} from '@/lib/utils/inventoryEncryption';

// Define a minimal InventoryItem type for this context
// interface InventoryItemForId {
//   id: number;
//   category: string;
// }

// Helper: get formatted ID (e.g., AD-000001)
function getFormattedId(category: string, categoryCounter: number) {
  let code = (category || 'XX')
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
  return `${code}-${String(categoryCounter).padStart(6, '0')}`;
}

export async function GET() {
  // Get all items
  const items = await db.select().from(inventoryItems);
  if (!items.length) return NextResponse.json([]);

  // Get all sizes for these items
  const sizes = await db
    .select()
    .from(inventorySizes)
    .where(
      inArray(
        inventorySizes.itemId,
        items.map((i) => i.id)
      )
    );
  // Get all inventory_tags for these items
  const invTags = await db
    .select()
    .from(inventoryTags)
    .where(
      inArray(
        inventoryTags.itemId,
        items.map((i) => i.id)
      )
    );
  // Get all tags for these tag ids
  const tagIds = invTags.map((t) => t.tagId);
  const allTags = tagIds.length ? await db.select().from(tags).where(inArray(tags.id, tagIds)) : [];

  // Build nested structure with decryption
  const result = items.map((item) => {
    // Decrypt inventory item data
    const decryptedItem = decryptInventoryData(item);

    const itemSizes = sizes
      .filter((s) => s.itemId === item.id)
      .map((s) => {
        // Decrypt size data with type safety
        const decryptedSize = decryptInventorySizeData(s);
        return {
          title: decryptedSize.title,
          quantity: decryptedSize.quantity,
          onHand: decryptedSize.onHand,
          price: decryptedSize.price,
        };
      });
    const itemTagIds = invTags.filter((t) => t.itemId === item.id).map((t) => t.tagId);
    const itemTags = allTags
      .filter((t) => itemTagIds.includes(t.id))
      .map((t) => {
        // Decrypt tag data
        const decryptedTag = decryptTagData(t);
        return decryptedTag.name;
      });
    return {
      id: item.id,
      formattedId: getFormattedId(decryptedItem.category, item.categoryCounter),
      name: decryptedItem.name,
      category: decryptedItem.category,
      imageUrl: item.imageUrl,
      tags: itemTags,
      sizes: itemSizes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Expect: { name, category, imageUrl, tags: string[], sizes: [{title, quantity, onHand, price}] }
  const { name, category, imageUrl, tags: tagNames, sizes } = body;

  // Debug log
  console.log('DEBUG: Received imageUrl in POST /api/inventory', imageUrl);

  // Encrypt the category for counter lookup
  const encryptedCategory = encryptInventoryData({ name: '', category }).category;

  // Try to increment the counter for the category
  let categoryCounter: number;

  // First try to find existing counter with encrypted category
  const [counter] = await db
    .select()
    .from(categoryCounters)
    .where(eq(categoryCounters.category, encryptedCategory));

  if (counter) {
    // Update existing counter
    const [updatedCounter] = await db
      .update(categoryCounters)
      .set({ counter: sql`${categoryCounters.counter} + 1` })
      .where(eq(categoryCounters.category, encryptedCategory))
      .returning({ counter: categoryCounters.counter });
    categoryCounter = updatedCounter.counter;
  } else {
    // If counter doesn't exist, create it and use 1
    await db.insert(categoryCounters).values({ category: encryptedCategory, counter: 1 });
    categoryCounter = 1;
  }

  // Encrypt inventory data before storing
  const encryptedInventoryData = encryptInventoryData({
    name,
    category,
    categoryCounter,
    imageUrl,
  });

  // Insert item with encrypted data
  const [item] = await db
    .insert(inventoryItems)
    .values({
      name: encryptedInventoryData.name,
      category: encryptedInventoryData.category,
      categoryCounter: categoryCounter,
      imageUrl,
    })
    .returning();

  // Insert sizes with encrypted data
  if (sizes && sizes.length) {
    const encryptedSizes = sizes.map(
      (s: { title: string; quantity: number; onHand: number; price: number }) => {
        const encryptedSize = encryptInventorySizeData({
          ...s,
          itemId: item.id,
        });
        return {
          title: encryptedSize.title,
          quantity: encryptedSize.quantity,
          onHand: encryptedSize.onHand,
          price: encryptedSize.price,
          itemId: item.id,
        };
      }
    );

    await db.insert(inventorySizes).values(encryptedSizes);
  }

  // Insert tags (create if not exist) with encrypted names
  const tagIds: number[] = [];
  if (tagNames && tagNames.length) {
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
    await db.insert(inventoryTags).values(tagIds.map((tagId) => ({ itemId: item.id, tagId })));
  }

  // Return the created item in UI structure
  return GET();
}
