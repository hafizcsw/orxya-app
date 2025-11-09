import { useState } from 'react';
import { useEdgeFunction } from './useEdgeFunction';

interface AIResponse {
  advice: string;
  actions?: string[];
  rationale: string;
  sources: string[];
  confidence: number;
  impacts?: {
    finance?: number;
    health?: number;
    time?: number;
  };
}

interface UseAIOrchestratorOptions {
  onSuccess?: (data: AIResponse) => void;
  onError?: (error: Error) => void;
}

export function useAIOrchestrator(options?: UseAIOrchestratorOptions) {
  const [cached, setCached] = useState(false);
  
  const { execute, loading, error, data, reset } = useEdgeFunction<{
    ok: boolean;
    cached?: boolean;
    data: AIResponse;
  }>('ai-orchestrator', {
    onSuccess: (result) => {
      setCached(result.cached ?? false);
      options?.onSuccess?.(result.data);
    },
    onError: options?.onError
  });

  const ask = async (prompt: string, domain?: string, locale: string = 'ar') => {
    setCached(false);
    return execute({ prompt, domain, locale });
  };

  return {
    ask,
    loading,
    error,
    response: data?.data,
    cached,
    reset
  };
}
