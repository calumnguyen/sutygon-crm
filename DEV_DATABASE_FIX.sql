-- =====================================================
-- DEVELOPMENT DATABASE FIX
-- Add missing fields to existing tables
-- =====================================================

-- Add missing fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_invoice_exported BOOLEAN NOT NULL DEFAULT FALSE;

-- Add missing fields to store_settings table
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS vat_percentage DECIMAL(5,2) NOT NULL DEFAULT 8.00;

-- Add missing fields to orders table (document fields)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS document_status VARCHAR(50);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('vat_amount', 'tax_invoice_exported', 'document_status')
ORDER BY column_name;

-- Check store_settings
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'store_settings' 
AND column_name = 'vat_percentage';

-- =====================================================
-- FIX COMPLETE
-- =====================================================
-- Your development database should now have all required fields.
-- The application should work without the query error. 