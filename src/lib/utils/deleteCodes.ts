// In-memory storage for delete codes (in production, use Redis or database)
export const deleteCodes = new Map<string, { code: string; expiresAt: number }>();

export function generateDeleteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeDeleteCode(userId: string, code: string, expiresAt: number): void {
  deleteCodes.set(userId, { code, expiresAt });
}

export function getDeleteCode(userId: string): { code: string; expiresAt: number } | undefined {
  return deleteCodes.get(userId);
}

export function removeDeleteCode(userId: string): void {
  deleteCodes.delete(userId);
}
