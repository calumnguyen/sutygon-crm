import { sql } from 'drizzle-orm';

export async function up() {
  // Create a new table with the correct schema
  await sql`
    CREATE TABLE inventory_items_new (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      category_counter INTEGER NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  // Copy data from old table to new table, set category_counter to 1 for all (manual fix may be needed)
  await sql`
    INSERT INTO inventory_items_new (name, category, category_counter, image_url, created_at, updated_at)
    SELECT name, category, 1, image_url, created_at, updated_at FROM inventory_items;
  `;

  // Drop the old table
  await sql`DROP TABLE inventory_items;`;

  // Rename the new table
  await sql`ALTER TABLE inventory_items_new RENAME TO inventory_items;`;
}

export async function down() {
  // Revert to previous schema (id as integer PK, no category_counter)
  await sql`
    CREATE TABLE inventory_items_old (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    INSERT INTO inventory_items_old (id, name, category, image_url, created_at, updated_at)
    SELECT id, name, category, image_url, created_at, updated_at FROM inventory_items;
  `;
  await sql`DROP TABLE inventory_items;`;
  await sql`ALTER TABLE inventory_items_old RENAME TO inventory_items;`;
}
