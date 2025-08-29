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
