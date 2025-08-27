CREATE TABLE order_warnings (
  id SERIAL PRIMARY KEY,
  order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
  inventory_item_id INTEGER REFERENCES inventory_items(id),
  warning_type VARCHAR(50) NOT NULL,
  warning_message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'high',
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_warnings_order_item_id ON order_warnings(order_item_id);
CREATE INDEX idx_order_warnings_inventory_item_id ON order_warnings(inventory_item_id);
CREATE INDEX idx_order_warnings_is_resolved ON order_warnings(is_resolved);
CREATE INDEX idx_order_warnings_created_at ON order_warnings(created_at);
