import { useState, useCallback } from 'react';
import { callFunction } from '@/lib/callFunction';

interface UseEdgeFunctionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for calling Edge Functions with automatic auth handling
 */
export function useEdgeFunction<T = any>(
  functionName: string,
  options?: UseEdgeFunctionOptions<T>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (body?: any): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await callFunction<T>(functionName, body);
        setData(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options?.onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [functionName, options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    execute,
    loading,
    error,
    data,
    reset,
  };
}
