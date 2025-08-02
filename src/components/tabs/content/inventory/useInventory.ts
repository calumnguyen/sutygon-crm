import { useState, useCallback, useEffect } from 'react';
import { InventoryItem } from '@/types/inventory';

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshInventory = useCallback(async () => {
    setIsRefreshing(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) {
        const text = await res.text();
        setFetchError('Không thể tải dữ liệu kho.');
        console.error('Fetch error:', res.status, text);
        return;
      }

      const data = await res.json();
      setInventory(data || []);
    } catch (err) {
      setFetchError('Lỗi khi tải dữ liệu kho.');
      console.error('Fetch error:', err);
      setInventory([]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Fetch inventory on mount
  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  return { inventory, setInventory, fetchError, setFetchError, refreshInventory, isRefreshing };
}
