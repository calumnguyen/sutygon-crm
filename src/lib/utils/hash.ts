import crypto from 'crypto';

export function hashValue(value: string): string {
  const secret = process.env.JWT_SECRET || 'default-secret';
  return crypto.createHash('sha256').update(value + secret).digest('hex');
}

export function verifyHash(value: string, hash: string): boolean {
  return hashValue(value) === hash;
} 