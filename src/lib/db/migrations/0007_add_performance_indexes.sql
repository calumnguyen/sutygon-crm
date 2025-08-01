-- Migration: Add performance indexes for high-volume operations
-- This migration adds comprehensive indexes to optimize queries for 100+ customers and orders daily

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_employee_key_idx ON users (employee_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_status_idx ON users (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_created_at_idx ON users (created_at);

-- Customers table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS customers_phone_idx ON customers (phone);
CREATE INDEX CONCURRENTLY IF NOT EXISTS customers_company_idx ON customers (company);
CREATE INDEX CONCURRENTLY IF NOT EXISTS customers_created_at_idx ON customers (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS customers_active_orders_idx ON customers (active_orders_count);

-- Orders table indexes (most critical for performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_customer_id_idx ON orders (customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_order_date_idx ON orders (order_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_expected_return_date_idx ON orders (expected_return_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_payment_status_idx ON orders (payment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_created_at_idx ON orders (created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_document_status_idx ON orders (document_status);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_customer_status_idx ON orders (customer_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_customer_payment_status_idx ON orders (customer_id, payment_status);

-- Order items table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_items_inventory_item_id_idx ON order_items (inventory_item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_items_is_custom_idx ON order_items (is_custom);
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_items_is_extension_idx ON order_items (is_extension);

-- Order notes table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_notes_order_id_idx ON order_notes (order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_notes_item_id_idx ON order_notes (item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_notes_done_idx ON order_notes (done);

-- Inventory items table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS inventory_items_category_idx ON inventory_items (category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS inventory_items_category_counter_idx ON inventory_items (category_counter);
CREATE INDEX CONCURRENTLY IF NOT EXISTS inventory_items_category_counter_composite_idx ON inventory_items (category, category_counter);
CREATE INDEX CONCURRENTLY IF NOT EXISTS inventory_items_created_at_idx ON inventory_items (created_at);

-- Inventory sizes table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS inventory_sizes_item_id_idx ON inventory_sizes (item_id);

-- Inventory tags table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS inventory_tags_item_id_idx ON inventory_tags (item_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS inventory_tags_tag_id_idx ON inventory_tags (tag_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS inventory_tags_item_tag_idx ON inventory_tags (item_id, tag_id);

-- Analyze tables to update statistics after creating indexes
ANALYZE users;
ANALYZE customers; 
ANALYZE orders;
ANALYZE order_items;
ANALYZE order_notes;
ANALYZE inventory_items;
ANALYZE inventory_sizes;
ANALYZE inventory_tags; 