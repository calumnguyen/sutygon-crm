-- Add user tracking fields to orders table
-- This will track who created the order and who marked it as picked up

-- Add created_by_user_id field to track who created the order
ALTER TABLE orders 
ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);

-- Add picked_up_by_user_id field to track who marked the order as picked up
ALTER TABLE orders 
ADD COLUMN picked_up_by_user_id INTEGER REFERENCES users(id);

-- Add picked_up_at timestamp to track when the order was marked as picked up
ALTER TABLE orders 
ADD COLUMN picked_up_at TIMESTAMP;

-- Add indexes for better query performance
CREATE INDEX idx_orders_created_by_user_id ON orders(created_by_user_id);
CREATE INDEX idx_orders_picked_up_by_user_id ON orders(picked_up_by_user_id);
CREATE INDEX idx_orders_picked_up_at ON orders(picked_up_at);

-- Add composite index for common query patterns
CREATE INDEX idx_orders_status_picked_up_by ON orders(status, picked_up_by_user_id);
CREATE INDEX idx_orders_created_by_created_at ON orders(created_by_user_id, created_at);

-- Add comments to document the new fields
COMMENT ON COLUMN orders.created_by_user_id IS 'User ID who created this order';
COMMENT ON COLUMN orders.picked_up_by_user_id IS 'User ID who marked this order as picked up';
COMMENT ON COLUMN orders.picked_up_at IS 'Timestamp when the order was marked as picked up';

-- Update existing orders to set created_by_user_id to a default user (you may want to adjust this)
-- This assumes you have a user with ID 1, adjust as needed
UPDATE orders 
SET created_by_user_id = 1 
WHERE created_by_user_id IS NULL;

-- Make created_by_user_id NOT NULL after setting default values
ALTER TABLE orders 
ALTER COLUMN created_by_user_id SET NOT NULL;
