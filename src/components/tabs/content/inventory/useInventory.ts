import { useState, useCallback, useEffect } from 'react';
import { InventoryItem } from '@/types/inventory';

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const ITEMS_PER_PAGE = 10;

  const fetchInventory = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setFetchError(null);

      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      const response = await fetch(
        `/api/inventory?limit=${ITEMS_PER_PAGE}&offset=${offset}&page=${pageNum}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }

      const data = await response.json();

      if (append) {
        setInventory((prev) => [...prev, ...data.items]);
      } else {
        setInventory(data.items);
      }

      setHasMore(data.hasMore);
      setTotal(data.total);
      setPage(pageNum);
    } catch (err) {
      setFetchError('Lỗi khi tải dữ liệu kho.');
      console.error('Fetch error:', err);
      if (!append) {
        setInventory([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const refreshInventory = useCallback(async () => {
    setIsRefreshing(true);
    setFetchError(null);

    try {
      await fetchInventory(1, false);
    } catch (err) {
      setFetchError('Lỗi khi tải dữ liệu kho.');
      console.error('Fetch error:', err);
      setInventory([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchInventory]);

  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      await fetchInventory(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchInventory]);

  // Fetch inventory on mount
  useEffect(() => {
    fetchInventory(1, false);
  }, [fetchInventory]);

  return {
    inventory,
    setInventory,
    fetchError,
    setFetchError,
    refreshInventory,
    isRefreshing,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    total,
  };
}
