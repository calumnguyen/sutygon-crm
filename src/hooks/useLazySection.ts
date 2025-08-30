import { useState, useEffect, useCallback, useRef } from 'react';

interface UseLazySectionOptions {
  delay?: number;
  minLoadTime?: number;
}

export function useLazySection<T>(
  fetchFunction: () => Promise<T>,
  options: UseLazySectionOptions = {}
) {
  const { delay = 0, minLoadTime = 500 } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const loadData = useCallback(async () => {
    if (hasLoaded.current) return; // Prevent multiple loads

    try {
      setLoading(true);
      setError(null);

      const startTime = Date.now();

      // Add delay if specified
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const result = await fetchFunction();

      // Ensure minimum load time for smooth UX
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadTime - elapsedTime);

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      setData(result);
      hasLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, delay, minLoadTime]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refetch = useCallback(() => {
    hasLoaded.current = false;
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
