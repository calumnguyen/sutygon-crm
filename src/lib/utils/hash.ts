import crypto from 'crypto';

export function hashValue(value: string): string {
  try {
    if (typeof value !== 'string') {
      throw new Error(`hashValue expects string, got ${typeof value}: ${value}`);
    }

    if (!value || value.length === 0) {
      throw new Error('hashValue received empty or null value');
    }

    const secret = process.env.JWT_SECRET || 'default-secret';
    const hash = crypto
      .createHash('sha256')
      .update(value + secret)
      .digest('hex');
    return hash;
  } catch (error) {
    console.error('Error in hashValue:', error);
    console.error('Value causing error:', { type: typeof value, value });
    throw error;
  }
}

export function verifyHash(value: string, hash: string): boolean {
  return hashValue(value) === hash;
}
