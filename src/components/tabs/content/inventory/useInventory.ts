import { useState, useCallback, useEffect } from 'react';
import { InventoryItem } from '@/types/inventory';

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refreshInventory = useCallback(() => {
    fetch('/api/inventory')
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          setFetchError('Không thể tải dữ liệu kho.');
          console.error('Fetch error:', res.status, text);
          return [];
        }
        try {
          return await res.json();
        } catch (err) {
          setFetchError('Dữ liệu trả về không hợp lệ.');
          console.error('JSON parse error:', err);
          return [];
        }
      })
      .then((data) => setInventory(data || []))
      .catch((err) => {
        setFetchError('Lỗi khi tải dữ liệu kho.');
        console.error('Fetch error:', err);
        setInventory([]);
      });
  }, []);

  // Fetch inventory on mount
  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  return { inventory, setInventory, fetchError, setFetchError, refreshInventory };
}
