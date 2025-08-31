-- Migration to change picked_up_by_user_id to picked_up_by_customer_name
-- Step 1: Add new column
ALTER TABLE order_item_pickups ADD COLUMN picked_up_by_customer_name VARCHAR(255);

-- Step 2: Drop old column and its index
DROP INDEX IF EXISTS order_item_pickups_picked_up_by_user_id_idx;
ALTER TABLE order_item_pickups DROP COLUMN picked_up_by_user_id;

-- Step 3: Add new index for customer name
CREATE INDEX order_item_pickups_picked_up_by_customer_name_idx ON order_item_pickups(picked_up_by_customer_name);

-- Step 4: Make the new column NOT NULL (after data migration if needed)
ALTER TABLE order_item_pickups ALTER COLUMN picked_up_by_customer_name SET NOT NULL;
