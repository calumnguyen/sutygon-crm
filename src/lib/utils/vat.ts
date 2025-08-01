// VAT calculation utilities
import { getVATPercentage } from './storeSettings';

// Default VAT rate (8%) - will be overridden by configurable setting
export const DEFAULT_VAT_RATE = 0.08;

/**
 * Calculate VAT amount for a given order total
 * @param orderTotal - The order total amount (excluding deposit)
 * @param vatRate - Optional VAT rate (will fetch from settings if not provided)
 * @returns The VAT amount
 */
export async function calculateVAT(orderTotal: number, vatRate?: number): Promise<number> {
  const rate = vatRate ?? (await getVATPercentage()) / 100;
  return Math.round(orderTotal * rate);
}

/**
 * Calculate total amount including VAT
 * @param orderTotal - The order total amount (excluding deposit)
 * @param vatRate - Optional VAT rate (will fetch from settings if not provided)
 * @returns Object with orderTotal, vatAmount, and totalWithVAT
 */
export async function calculateOrderTotals(orderTotal: number, vatRate?: number): Promise<{
  orderTotal: number;
  vatAmount: number;
  totalWithVAT: number;
}> {
  const vatAmount = await calculateVAT(orderTotal, vatRate);
  const totalWithVAT = orderTotal + vatAmount;
  
  return {
    orderTotal,
    vatAmount,
    totalWithVAT
  };
}

/**
 * Get current VAT rate for display
 * @returns Formatted VAT rate string
 */
export async function getVATRateDisplay(): Promise<string> {
  const rate = await getVATPercentage();
  return `${rate}%`;
} 