-- =====================================================
-- SUTYGON CRM - PRODUCTION DATABASE SETUP
-- Complete SQL script to drop all tables and recreate them
-- =====================================================

-- Drop all existing tables in correct order (respecting foreign key constraints)
-- Using CASCADE to handle dependencies automatically
DROP TABLE IF EXISTS order_notes CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS inventory_tags CASCADE;
DROP TABLE IF EXISTS inventory_sizes CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS category_counters CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS user_view_preferences CASCADE;
DROP TABLE IF EXISTS store_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- CREATE ALL TABLES
-- =====================================================

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, -- This will store encrypted name
    employee_key VARCHAR(255) NOT NULL UNIQUE, -- Increased for hashed values
    role VARCHAR(255) NOT NULL, -- Increased for encrypted values
    status VARCHAR(255) NOT NULL, -- Increased for encrypted values
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Store settings table
CREATE TABLE store_settings (
    id SERIAL PRIMARY KEY,
    store_code VARCHAR(255) NOT NULL, -- Increased for hashed values
    vat_percentage DECIMAL(5,2) NOT NULL DEFAULT 8.00, -- VAT percentage (default 8%)
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Category counters table
CREATE TABLE category_counters (
    category TEXT PRIMARY KEY, -- This will store encrypted category
    counter INTEGER NOT NULL DEFAULT 0
);

-- Inventory items table
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, -- This will store encrypted name
    category TEXT NOT NULL, -- This will store encrypted category
    category_counter INTEGER NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE -- This will store encrypted name
);

-- User view preferences table
CREATE TABLE user_view_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_code VARCHAR(8) NOT NULL,
    view_name VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(store_code, view_name)
);

-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone VARCHAR(255) NOT NULL UNIQUE, -- Updated from 20 to 255 for encrypted values
    company VARCHAR(255),
    address VARCHAR(255),
    notes TEXT,
    active_orders_count INTEGER NOT NULL DEFAULT 0,
    late_orders_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory sizes table
CREATE TABLE inventory_sizes (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    title TEXT NOT NULL, -- This will store encrypted title
    quantity TEXT NOT NULL, -- This will store encrypted quantity
    on_hand TEXT NOT NULL, -- This will store encrypted onHand
    price TEXT NOT NULL -- This will store encrypted price
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    order_date TIMESTAMP NOT NULL,
    expected_return_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, cancelled, paid
    total_amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- 8% VAT on order total
    deposit_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20), -- 'cash', 'qr', 'partial'
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'partial', 'Paid Full', 'Partially Paid', 'Paid Full with Deposit'
    -- Document deposit fields
    document_type TEXT, -- This will store encrypted document type
    document_other TEXT, -- This will store encrypted document other info
    document_name TEXT, -- This will store encrypted document name
    document_id TEXT, -- This will store encrypted document ID
    document_status VARCHAR(50), -- 'on_file', 'returned', etc.
    -- Deposit info
    deposit_type VARCHAR(10), -- 'vnd' or 'percent'
    deposit_value DECIMAL(10,2),
    tax_invoice_exported BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    inventory_item_id INTEGER REFERENCES inventory_items(id), -- Can be null for custom items
    name TEXT NOT NULL, -- This will store encrypted name
    size TEXT NOT NULL, -- This will store encrypted size
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL,
    is_extension BOOLEAN NOT NULL DEFAULT FALSE,
    extra_days INTEGER,
    fee_type VARCHAR(20), -- 'vnd' or 'percent'
    percent INTEGER,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Order notes table
CREATE TABLE order_notes (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    item_id INTEGER REFERENCES order_items(id), -- Can be null for general notes
    text TEXT NOT NULL, -- This will store encrypted text
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inventory tags table (junction table)
CREATE TABLE inventory_tags (
    item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    tag_id INTEGER NOT NULL REFERENCES tags(id),
    PRIMARY KEY (item_id, tag_id)
);

-- =====================================================
-- CREATE ALL INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX users_employee_key_idx ON users(employee_key);
CREATE INDEX users_status_idx ON users(status);
CREATE INDEX users_created_at_idx ON users(created_at);

-- Inventory items indexes
CREATE INDEX inventory_items_category_idx ON inventory_items(category);
CREATE INDEX inventory_items_category_counter_idx ON inventory_items(category_counter);
CREATE INDEX inventory_items_category_counter_composite_idx ON inventory_items(category, category_counter);
CREATE INDEX inventory_items_created_at_idx ON inventory_items(created_at);
CREATE INDEX inventory_items_name_search_idx ON inventory_items(name);
CREATE INDEX inventory_items_name_category_idx ON inventory_items(name, category);

-- Inventory sizes indexes
CREATE INDEX inventory_sizes_item_id_idx ON inventory_sizes(item_id);

-- Tags indexes (no additional indexes needed as name is unique)

-- Inventory tags indexes
CREATE INDEX inventory_tags_item_id_idx ON inventory_tags(item_id);
CREATE INDEX inventory_tags_tag_id_idx ON inventory_tags(tag_id);
CREATE INDEX inventory_tags_item_tag_idx ON inventory_tags(item_id, tag_id);

-- Customers indexes
CREATE INDEX customers_phone_idx ON customers(phone);
CREATE INDEX customers_company_idx ON customers(company);
CREATE INDEX customers_created_at_idx ON customers(created_at);
CREATE INDEX customers_active_orders_idx ON customers(active_orders_count);

-- Orders indexes
CREATE INDEX orders_customer_id_idx ON orders(customer_id);
CREATE INDEX orders_order_date_idx ON orders(order_date);
CREATE INDEX orders_expected_return_date_idx ON orders(expected_return_date);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_payment_status_idx ON orders(payment_status);
CREATE INDEX orders_customer_status_idx ON orders(customer_id, status);
CREATE INDEX orders_customer_payment_status_idx ON orders(customer_id, payment_status);
CREATE INDEX orders_created_at_idx ON orders(created_at);
CREATE INDEX orders_document_status_idx ON orders(document_status);
CREATE INDEX orders_customer_created_at_idx ON orders(customer_id, created_at);

-- Order items indexes
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_items_inventory_item_id_idx ON order_items(inventory_item_id);
CREATE INDEX order_items_is_custom_idx ON order_items(is_custom);
CREATE INDEX order_items_is_extension_idx ON order_items(is_extension);

-- Order notes indexes
CREATE INDEX order_notes_order_id_idx ON order_notes(order_id);
CREATE INDEX order_notes_item_id_idx ON order_notes(item_id);
CREATE INDEX order_notes_done_idx ON order_notes(done);

-- User view preferences indexes
CREATE INDEX idx_user_view_preferences_order ON user_view_preferences(store_code, display_order);
CREATE INDEX idx_user_view_preferences_store_code ON user_view_preferences(store_code);

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

-- Insert default store settings
INSERT INTO store_settings (store_code, vat_percentage) VALUES ('DEFAULT', 8.00);

-- Insert default user view preferences
INSERT INTO user_view_preferences (store_code, view_name, display_order, is_active) VALUES
('DEFAULT', 'customers', 1, true),
('DEFAULT', 'inventory', 2, true),
('DEFAULT', 'orders', 3, true),
('DEFAULT', 'users', 4, true);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verify all indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Count records in each table
SELECT 
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'store_settings', COUNT(*) FROM store_settings
UNION ALL
SELECT 'user_view_preferences', COUNT(*) FROM user_view_preferences
UNION ALL
SELECT 'category_counters', COUNT(*) FROM category_counters
UNION ALL
SELECT 'inventory_items', COUNT(*) FROM inventory_items
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'inventory_sizes', COUNT(*) FROM inventory_sizes
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'order_notes', COUNT(*) FROM order_notes
UNION ALL
SELECT 'inventory_tags', COUNT(*) FROM inventory_tags;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Your production database is now ready!
-- All tables, indexes, and default data have been created.
-- You can now run your application against this database. 