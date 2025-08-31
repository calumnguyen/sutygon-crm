-- Add pickedUpQuantity column to order_items table
ALTER TABLE order_items ADD COLUMN picked_up_quantity INTEGER DEFAULT 0 NOT NULL;

-- Add index for better query performance
CREATE INDEX order_items_picked_up_quantity_idx ON order_items(picked_up_quantity);
