-- Add payment history table
CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(10) NOT NULL CHECK (payment_method IN ('cash', 'qr')),
    amount NUMERIC(10,2) NOT NULL,
    processed_by_user_id INTEGER NOT NULL REFERENCES users(id), -- Who processed the payment
    payment_date TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_history_order_id ON payment_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_processed_by ON payment_history(processed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_method ON payment_history(payment_method);
