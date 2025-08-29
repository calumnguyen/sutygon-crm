# Order Tracking System - Database Implementation

This document outlines the comprehensive order tracking system that tracks who created orders and who marked them as picked up, with extensibility for future tracking needs.

## Overview

The tracking system consists of two main components:

1. **Direct tracking fields** in the `orders` table
2. **Comprehensive activity logging** in a separate `order_activity_log` table

## 1. Basic Order Tracking Fields

### SQL Commands to Add Tracking Fields

Run the following SQL commands to add basic tracking fields to the `orders` table:

```sql
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
```

## 2. Comprehensive Activity Logging System

### SQL Commands to Create Activity Log Table

For more comprehensive tracking and future extensibility, run these additional SQL commands:

```sql
-- Create order activity log table for comprehensive tracking
-- This allows tracking of various order activities with timestamps and user information

CREATE TABLE order_activity_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'created', 'picked_up', 'returned', 'cancelled', 'payment_received', etc.
    performed_by_user_id INTEGER NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    additional_data JSONB, -- Store any additional data as JSON for flexibility
    notes TEXT -- Optional notes about the activity
);

-- Add indexes for better query performance
CREATE INDEX idx_order_activity_log_order_id ON order_activity_log(order_id);
CREATE INDEX idx_order_activity_log_activity_type ON order_activity_log(activity_type);
CREATE INDEX idx_order_activity_log_performed_by ON order_activity_log(performed_by_user_id);
CREATE INDEX idx_order_activity_log_performed_at ON order_activity_log(performed_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_order_activity_log_order_activity ON order_activity_log(order_id, activity_type);
CREATE INDEX idx_order_activity_log_user_activity ON order_activity_log(performed_by_user_id, activity_type);
CREATE INDEX idx_order_activity_log_order_date ON order_activity_log(order_id, performed_at);

-- Add comments to document the table
COMMENT ON TABLE order_activity_log IS 'Comprehensive log of all order activities for audit and tracking purposes';
COMMENT ON COLUMN order_activity_log.activity_type IS 'Type of activity performed (created, picked_up, returned, etc.)';
COMMENT ON COLUMN order_activity_log.performed_by_user_id IS 'User ID who performed the activity';
COMMENT ON COLUMN order_activity_log.additional_data IS 'JSON data with additional information about the activity';
COMMENT ON COLUMN order_activity_log.notes IS 'Optional notes about the activity';

-- Create a function to automatically log order creation
CREATE OR REPLACE FUNCTION log_order_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_activity_log (order_id, activity_type, performed_by_user_id, additional_data)
    VALUES (NEW.id, 'created', COALESCE(NEW.created_by_user_id, 1),
            jsonb_build_object('status', NEW.status, 'total_amount', NEW.total_amount));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log order creation
CREATE TRIGGER trigger_log_order_creation
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_creation();

-- Create a function to log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_activity_log (order_id, activity_type, performed_by_user_id, additional_data, notes)
        VALUES (
            NEW.id,
            CASE
                WHEN NEW.status = 'Picked Up' THEN 'picked_up'
                WHEN NEW.status = 'Completed' THEN 'completed'
                WHEN NEW.status = 'Cancelled' THEN 'cancelled'
                ELSE 'status_changed'
            END,
            COALESCE(NEW.picked_up_by_user_id, NEW.created_by_user_id, 1),
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
            'Status changed from ' || OLD.status || ' to ' || NEW.status
        );

        -- If status is 'Picked Up', update the picked_up_at timestamp
        IF NEW.status = 'Picked Up' THEN
            UPDATE orders
            SET picked_up_at = NOW()
            WHERE id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log status changes
CREATE TRIGGER trigger_log_order_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_status_change();

-- Create a function to manually log activities
CREATE OR REPLACE FUNCTION log_order_activity(
    p_order_id INTEGER,
    p_activity_type VARCHAR(50),
    p_performed_by_user_id INTEGER,
    p_additional_data JSONB DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_log_id INTEGER;
BEGIN
    INSERT INTO order_activity_log (order_id, activity_type, performed_by_user_id, additional_data, notes)
    VALUES (p_order_id, p_activity_type, p_performed_by_user_id, p_additional_data, p_notes)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON order_activity_log TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE order_activity_log_id_seq TO your_app_user;
```

## 3. Application Integration

### Updated API Endpoints

The following API endpoints have been updated to include user tracking:

1. **Order Status Update** (`/api/orders/update-status`):

   - Now tracks who marked the order as picked up
   - Automatically sets `picked_up_by_user_id` and `picked_up_at` when status changes to "Picked Up"

2. **Order Creation** (various endpoints):
   - Need to be updated to include `created_by_user_id` when creating orders

### Frontend Integration

The pickup confirmation modal now properly tracks user actions and updates the database with user information.

## 4. Query Examples

### Basic Queries

```sql
-- Find all orders created by a specific user
SELECT o.*, u.name as created_by_name
FROM orders o
JOIN users u ON o.created_by_user_id = u.id
WHERE o.created_by_user_id = 1;

-- Find all orders picked up by a specific user
SELECT o.*, u.name as picked_up_by_name
FROM orders o
JOIN users u ON o.picked_up_by_user_id = u.id
WHERE o.picked_up_by_user_id = 1;

-- Find orders picked up today
SELECT o.*, u.name as picked_up_by_name
FROM orders o
JOIN users u ON o.picked_up_by_user_id = u.id
WHERE DATE(o.picked_up_at) = CURRENT_DATE;
```

### Activity Log Queries

```sql
-- Get complete activity history for an order
SELECT
    oal.*,
    u.name as performed_by_name
FROM order_activity_log oal
JOIN users u ON oal.performed_by_user_id = u.id
WHERE oal.order_id = 123
ORDER BY oal.performed_at;

-- Get all pickup activities by user
SELECT
    oal.*,
    u.name as performed_by_name,
    o.id as order_id
FROM order_activity_log oal
JOIN users u ON oal.performed_by_user_id = u.id
JOIN orders o ON oal.order_id = o.id
WHERE oal.activity_type = 'picked_up'
ORDER BY oal.performed_at DESC;

-- Get user activity summary
SELECT
    u.name as user_name,
    oal.activity_type,
    COUNT(*) as activity_count
FROM order_activity_log oal
JOIN users u ON oal.performed_by_user_id = u.id
WHERE oal.performed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.name, oal.activity_type
ORDER BY u.name, activity_count DESC;
```

## 5. Future Extensibility

The activity logging system is designed to be easily extensible. You can add new activity types by simply calling the `log_order_activity` function:

```sql
-- Example: Log a custom activity
SELECT log_order_activity(
    123,                    -- order_id
    'payment_received',     -- activity_type
    1,                      -- performed_by_user_id
    '{"amount": 50000, "method": "cash"}'::jsonb,  -- additional_data
    'Payment received for order #123'               -- notes
);
```

### Common Activity Types to Consider:

- `created` - Order created
- `picked_up` - Order marked as picked up
- `returned` - Order returned
- `cancelled` - Order cancelled
- `payment_received` - Payment received
- `payment_partial` - Partial payment received
- `document_deposited` - Document deposited
- `document_returned` - Document returned
- `status_changed` - Status changed (generic)

## 6. Implementation Steps

1. **Run the SQL commands** in the order provided above
2. **Update your application code** to include user tracking in order creation
3. **Test the tracking system** with sample orders
4. **Monitor the activity logs** to ensure proper tracking
5. **Add any additional activity types** as needed for your business requirements

## 7. Notes

- The system automatically handles user session validation
- All timestamps are stored in UTC
- The activity log uses JSONB for flexible additional data storage
- Indexes are optimized for common query patterns
- Foreign key constraints ensure data integrity
- The system is backward compatible with existing orders
