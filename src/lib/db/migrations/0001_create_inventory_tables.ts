import 'dotenv/config';
console.log('DATABASE_URL:', process.env.DATABASE_URL);
import { sql } from 'drizzle-orm';

export async function up() {
  await sql`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS inventory_sizes (
      id SERIAL PRIMARY KEY,
      item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      title TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      on_hand INTEGER NOT NULL,
      price INTEGER NOT NULL
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS inventory_tags (
      item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      tag_id INTEGER NOT NULL REFERENCES tags(id)
    );
  `;
}

export async function down() {
  await sql`DROP TABLE IF EXISTS inventory_tags;`;
  await sql`DROP TABLE IF EXISTS tags;`;
  await sql`DROP TABLE IF EXISTS inventory_sizes;`;
  await sql`DROP TABLE IF EXISTS inventory_items;`;
}

if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration complete.');
    })
    .catch((err) => {
      console.error('Migration failed:', err);
    });
}
