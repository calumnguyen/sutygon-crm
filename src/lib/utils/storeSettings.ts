import { db } from '@/lib/db';
import { storeSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface StoreSettings {
  id: number;
  storeCode: string;
  vatPercentage: string; // Database stores as decimal string
  updatedAt: Date;
}

/**
 * Get current store settings
 */
export async function getStoreSettings(): Promise<StoreSettings | null> {
  try {
    const settings = await db.select().from(storeSettings).limit(1);
    return settings[0] || null;
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return null;
  }
}

/**
 * Update VAT percentage
 */
export async function updateVATPercentage(newPercentage: number): Promise<boolean> {
  try {
    const settings = await getStoreSettings();
    if (settings) {
      await db.update(storeSettings)
        .set({ 
          vatPercentage: newPercentage.toString(),
          updatedAt: new Date()
        })
        .where(eq(storeSettings.id, settings.id));
    } else {
      // Create new settings if none exist
      await db.insert(storeSettings).values({
        storeCode: 'default',
        vatPercentage: newPercentage.toString(),
        updatedAt: new Date()
      });
    }
    return true;
  } catch (error) {
    console.error('Error updating VAT percentage:', error);
    return false;
  }
}

/**
 * Get current VAT percentage
 */
export async function getVATPercentage(): Promise<number> {
  try {
    const settings = await getStoreSettings();
    return settings?.vatPercentage ? parseFloat(settings.vatPercentage) : 8.00; // Default to 8%
  } catch (error) {
    console.error('Error getting VAT percentage:', error);
    return 8.00; // Default fallback
  }
} 