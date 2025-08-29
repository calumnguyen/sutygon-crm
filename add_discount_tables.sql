-- Add discount itemized names table
CREATE TABLE IF NOT EXISTS discount_itemized_names (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial discount itemized names
INSERT INTO discount_itemized_names (name) VALUES 
    ('Giảm giá tri ân khách hàng'),
    ('Giảm giá bồi thường')
ON CONFLICT (name) DO NOTHING;

-- Add discount table
CREATE TABLE IF NOT EXISTS order_discounts (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('vnd', 'percent')),
    discount_value NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL, -- Calculated amount
    itemized_name_id INTEGER NOT NULL REFERENCES discount_itemized_names(id),
    description TEXT,
    requested_by_user_id INTEGER NOT NULL REFERENCES users(id), -- User who requested the discount
    authorized_by_user_id INTEGER NOT NULL REFERENCES users(id), -- User who approved the discount
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_discounts_order_id ON order_discounts(order_id);
CREATE INDEX IF NOT EXISTS idx_order_discounts_requested_by ON order_discounts(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_order_discounts_authorized_by ON order_discounts(authorized_by_user_id);
