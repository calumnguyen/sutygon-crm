import { sql } from 'drizzle-orm';

export async function up() {
  // Create category_counters table
  await sql`
    CREATE TABLE IF NOT EXISTS category_counters (
      category TEXT PRIMARY KEY,
      counter INTEGER NOT NULL DEFAULT 0
    );
  `;

  // Initialize counters for existing categories
  await sql`
    INSERT INTO category_counters (category, counter)
    VALUES 
      ('Áo Dài', 0),
      ('Áo', 0),
      ('Quần', 0),
      ('Văn Nghệ', 0),
      ('Đồ Tây', 0),
      ('Giầy', 0),
      ('Dụng Cụ', 0)
    ON CONFLICT (category) DO NOTHING;
  `;
}

export async function down() {
  await sql`DROP TABLE IF EXISTS category_counters;`;
}
