import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems, inventorySizes, tags, inventoryTags } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Define a minimal InventoryItem type for this context
interface InventoryItemForId {
  id: number;
  category: string;
}

// Helper: get formatted ID (e.g., AD-000001)
function getFormattedId(item: InventoryItemForId) {
  let code = (item.category || 'XX')
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
  return `${code}-${String(item.id).padStart(6, '0')}`;
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

  // Build nested structure
  const result = items.map((item) => {
    const itemSizes = sizes
      .filter((s) => s.itemId === item.id)
      .map((s) => ({
        title: s.title,
        quantity: s.quantity,
        onHand: s.onHand,
        price: s.price,
      }));
    const itemTagIds = invTags.filter((t) => t.itemId === item.id).map((t) => t.tagId);
    const itemTags = allTags.filter((t) => itemTagIds.includes(t.id)).map((t) => t.name);
    return {
      id: item.id,
      formattedId: getFormattedId(item),
      name: item.name,
      category: item.category,
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
  // Insert item
  const [item] = await db.insert(inventoryItems).values({ name, category, imageUrl }).returning();
  // Insert sizes
  if (sizes && sizes.length) {
    await db
      .insert(inventorySizes)
      .values(
        sizes.map((s: { title: string; quantity: number; onHand: number; price: number }) => ({
          ...s,
          itemId: item.id,
        }))
      );
  }
  // Insert tags (create if not exist)
  const tagIds: number[] = [];
  if (tagNames && tagNames.length) {
    for (const tagName of tagNames) {
      let [tag] = await db.select().from(tags).where(eq(tags.name, tagName));
      if (!tag) {
        [tag] = await db.insert(tags).values({ name: tagName }).returning();
      }
      tagIds.push(tag.id);
    }
    // Insert into inventory_tags
    await db.insert(inventoryTags).values(tagIds.map((tagId) => ({ itemId: item.id, tagId })));
  }
  // Return the created item in UI structure
  return GET();
}
