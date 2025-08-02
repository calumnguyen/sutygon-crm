-- =====================================================
-- PRODUCTION INITIAL SETUP (CORRECTED)
-- Insert admin user and store settings with encrypted values
-- Generated with correct ENCRYPTION_KEY from .env
-- =====================================================

-- Update existing admin user (Calum) with correct encrypted values
-- Employee Key: 123456 (hashed)
-- Name: Calum (encrypted) - Should decrypt to "Calum"
-- Role: admin (encrypted) - Should decrypt to "admin"
-- Status: active (encrypted) - Should decrypt to "active"
UPDATE users SET 
  name = '8e0d5dbfb96881fc05f5783284d89d3c:665ed4ea5542b46f5b9a37e12b8dda49',
  role = '503cfa74767a7731c5771661b3fbeec4:792dcca78ad2ef84b153d67a6e1e39f4',
  status = 'bda795a4efd83da14d5d786c3ae41921:bc06086c1617d13512641c62a1522d16',
  updated_at = NOW()
WHERE employee_key = '8b51f6c7279567fd6b23898d516333041e967cc3512485c1aa3dd07071327fc1';

-- Insert store settings
-- Store Code: 00000000 (hashed)
-- VAT Percentage: 8.00%
INSERT INTO store_settings (store_code, vat_percentage, updated_at) VALUES (
  '78aa4d64b992cbf61ceef0f5deb1d02e1965cfaac1a6d3410585373242555db7',
  8.00,
  NOW()
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if admin user was created successfully
SELECT 
  id, 
  name, 
  employee_key, 
  role, 
  status,
  created_at
FROM users 
WHERE employee_key = '8b51f6c7279567fd6b23898d516333041e967cc3512485c1aa3dd07071327fc1';

-- Check if store settings were created successfully
SELECT 
  id, 
  store_code, 
  vat_percentage,
  updated_at
FROM store_settings 
WHERE store_code = '78aa4d64b992cbf61ceef0f5deb1d02e1965cfaac1a6d3410585373242555db7';

-- =====================================================
-- LOGIN CREDENTIALS
-- =====================================================
-- Admin Login:
-- Employee Key: 123456
-- Store Code: 00000000
-- ===================================================== 