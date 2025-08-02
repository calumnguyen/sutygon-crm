import { useState, useEffect, useCallback } from 'react';

interface InventoryOverview {
  totalModels: number;
  totalProducts: number;
}

export function useInventoryOverview(autoRefresh: boolean = true) {
  const [data, setData] = useState<InventoryOverview>({ totalModels: 0, totalProducts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/inventory/overview');

      if (!response.ok) {
        throw new Error('Failed to fetch inventory overview');
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Inventory overview fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Auto-refresh every 20 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOverview();
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchOverview]);

  return {
    data,
    loading,
    error,
    refetch: fetchOverview,
  };
}
