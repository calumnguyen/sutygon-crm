-- =====================================================
-- CHECK PRODUCTION DATA
-- =====================================================

-- Check what users exist
SELECT 
  id, 
  name, 
  employee_key, 
  role, 
  status,
  created_at,
  updated_at
FROM users;

-- Check what store settings exist
SELECT 
  id, 
  store_code, 
  vat_percentage,
  updated_at
FROM store_settings;

-- Check if there are any other tables with data
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'store_settings', COUNT(*) FROM store_settings
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'inventory_items', COUNT(*) FROM inventory_items; 