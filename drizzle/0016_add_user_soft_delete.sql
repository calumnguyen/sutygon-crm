-- Add deletedAt field to users table for soft delete functionality
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;

-- Add index for soft delete queries
CREATE INDEX users_deleted_at_idx ON users(deleted_at);
