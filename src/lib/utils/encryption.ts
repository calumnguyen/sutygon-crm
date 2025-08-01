import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-here';
const ALGORITHM = 'aes-256-cbc';

// Convert hex key to buffer
const key = Buffer.from(ENCRYPTION_KEY, 'hex');

export function encrypt(text: string): string {
  // Defensive check against undefined/null inputs
  if (text === undefined || text === null || typeof text !== 'string') {
    throw new Error(`encrypt() received invalid input: ${typeof text} (${text}). Expected string.`);
  }
  
  // Use deterministic IV for searchable fields
  const iv = crypto.createHash('sha256').update(text + ENCRYPTION_KEY).digest().slice(0, 16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  try {
    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) {
      console.warn('Invalid encrypted text format:', encryptedText);
      return encryptedText; // Return original if not in expected format
    }
    
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedData = textParts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText; // Return original if decryption fails
  }
}

// Helper function to check if text is encrypted
export function isEncrypted(text: string): boolean {
  // Check if it has the format: hex:hex (IV:encrypted_data)
  if (!text || typeof text !== 'string') return false;
  
  const parts = text.split(':');
  if (parts.length !== 2) return false;
  
  // Check if both parts are valid hex strings
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(parts[0]) && hexRegex.test(parts[1]);
} 