import { db } from './index';
import { inventoryItems, inventorySizes, tags, inventoryTags } from './schema';

async function seed() {
  // Create tags
  const [tag1] = await db
    .insert(tags)
    .values({ name: 'Cao Cấp' })
    .onConflictDoNothing()
    .returning();
  const [tag2] = await db
    .insert(tags)
    .values({ name: 'Đám Cưới' })
    .onConflictDoNothing()
    .returning();
  // Create item
  const [item] = await db
    .insert(inventoryItems)
    .values({
      name: 'Áo Dài Truyền Thống',
      category: 'Áo Dài',
      imageUrl: '/no-image.png',
    })
    .returning();
  // Create sizes
  await db
    .insert(inventorySizes)
    .values({
      itemId: item.id,
      title: 'S',
      quantity: 10,
      onHand: 10,
      price: 500000,
    })
    .returning();
  await db
    .insert(inventorySizes)
    .values({
      itemId: item.id,
      title: 'M',
      quantity: 5,
      onHand: 5,
      price: 550000,
    })
    .returning();
  // Link tags
  if (tag1) await db.insert(inventoryTags).values({ itemId: item.id, tagId: tag1.id });
  if (tag2) await db.insert(inventoryTags).values({ itemId: item.id, tagId: tag2.id });
  console.log('Seeded inventory with 1 item, 2 sizes, 2 tags.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
