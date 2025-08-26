import { useState, useCallback, useEffect, useRef } from 'react';
import { InventoryItem } from '@/types/inventory';
import { useUser } from '@/context/UserContext';

export function useInventory() {
  const { sessionToken } = useUser();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const isFetchingRef = useRef(false);
  const currentRequestIdRef = useRef(0);

  const ITEMS_PER_PAGE = 10;

  const fetchInventory = useCallback(
    async (
      pageNum: number = 1,
      append: boolean = false,
      filters?: {
        categories?: string[];
        imageFilter?: { hasImage: 'all' | 'with_image' | 'without_image' };
        sortBy?: 'newest' | 'oldest' | 'none';
      }
    ) => {
      // Only prevent multiple simultaneous requests for the same operation
      // Allow new filter requests to override ongoing requests
      if (isFetchingRef.current && append) return;

      // Don't fetch if no session token
      if (!sessionToken) {
        setFetchError('No session token available');
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // Generate unique request ID for this fetch
      const requestId = ++currentRequestIdRef.current;

      try {
        isFetchingRef.current = true;

        if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setFetchError(null);

        const offset = (pageNum - 1) * ITEMS_PER_PAGE;

        // Build query parameters
        const params = new URLSearchParams({
          limit: ITEMS_PER_PAGE.toString(),
          offset: offset.toString(),
          page: pageNum.toString(),
        });

        // Determine which endpoint to use based on filters
        let endpoint = '/api/inventory';

        // If we have category filters or image filter, use the filter endpoint
        if (
          filters?.categories?.length ||
          (filters?.imageFilter && filters.imageFilter.hasImage !== 'all')
        ) {
          endpoint = '/api/inventory/filter';
          console.log('🎯 Sending filters to filter endpoint:', filters);

          // Add category filters
          if (filters?.categories?.length) {
            filters.categories.forEach((category) => {
              params.append('category', category);
            });
          }

          // Add image filter
          if (filters?.imageFilter && filters.imageFilter.hasImage !== 'all') {
            params.append('hasImage', filters.imageFilter.hasImage);
          }

          // Add sort filter
          if (filters?.sortBy && filters.sortBy !== 'none') {
            params.append('sortBy', filters.sortBy);
          }
        } else {
          // Add sort filter to main inventory endpoint
          if (filters?.sortBy && filters.sortBy !== 'none') {
            params.append('sortBy', filters.sortBy);
            console.log('🎯 Sending sortBy to main inventory endpoint:', filters.sortBy);
          }
        }

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch inventory');
        }

        const data = await response.json();

        // Only update state if this is still the current request
        if (requestId === currentRequestIdRef.current) {
          if (append) {
            setInventory((prev) => [...prev, ...data.items]);
          } else {
            setInventory(data.items);
          }

          setHasMore(data.hasMore);
          setTotal(data.total);
          setPage(pageNum);
        }
      } catch (err) {
        // Only update error state if this is still the current request
        if (requestId === currentRequestIdRef.current) {
          setFetchError('Lỗi khi tải dữ liệu kho.');
          console.error('Fetch error:', err);
          if (!append) {
            setInventory([]);
          }
        }
      } finally {
        // Only clear loading state if this is still the current request
        if (requestId === currentRequestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
          isFetchingRef.current = false;
        }
      }
    },
    [sessionToken]
  );

  const refreshInventory = useCallback(
    async (filters?: {
      categories?: string[];
      tags?: string[];
      imageFilter?: { hasImage: 'all' | 'with_image' | 'without_image' };
      sortBy?: 'newest' | 'oldest' | 'none';
    }) => {
      setIsRefreshing(true);
      setFetchError(null);

      try {
        await fetchInventory(1, false, filters);
      } catch (err) {
        setFetchError('Lỗi khi tải dữ liệu kho.');
        console.error('Fetch error:', err);
        setInventory([]);
      } finally {
        setIsRefreshing(false);
      }
    },
    [fetchInventory]
  );

  const loadMore = useCallback(
    async (filters?: {
      categories?: string[];
      tags?: string[];
      imageFilter?: { hasImage: 'all' | 'with_image' | 'without_image' };
      sortBy?: 'newest' | 'oldest' | 'none';
    }) => {
      if (!loadingMore && hasMore && !isFetchingRef.current) {
        await fetchInventory(page + 1, true, filters);
      }
    },
    [loadingMore, hasMore, page, fetchInventory]
  );

  // Fetch inventory on mount
  useEffect(() => {
    fetchInventory(1, false);
  }, [fetchInventory, sessionToken]);

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
    page,
    total,
  };
}
