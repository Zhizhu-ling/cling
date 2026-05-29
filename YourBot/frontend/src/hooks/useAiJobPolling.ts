import { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '@/api/ai';
import type { AiJobData, AiJobStatus } from '@/api/ai';

/**
 * Terminal statuses that stop polling.
 */
const TERMINAL_STATUSES: Set<AiJobStatus> = new Set(['success', 'fail', 'canceled']);

/**
 * Polling configuration constants.
 */
const INITIAL_INTERVAL_MS = 1000;
const MAX_INTERVAL_MS = 10000;
const BACKOFF_FACTOR = 2;

/**
 * Return type for the useAiJobPolling hook.
 */
export interface UseAiJobPollingResult {
  /** Current job status, null if no job or not yet fetched. */
  status: AiJobStatus | null;
  /** Full job data when available. */
  data: AiJobData | null;
  /** Error message if polling failed or job failed. */
  error: string | null;
  /** Whether the job is still in progress (pending or running). */
  isLoading: boolean;
  /** Reset and restart polling for the current jobId. */
  retry: () => void;
}

/**
 * Hook that polls an AI job's status endpoint with exponential backoff.
 *
 * - Starts polling when a non-null jobId is provided
 * - Uses exponential backoff: 1s → 2s → 4s → 8s → 10s (capped)
 * - Stops polling when the job reaches a terminal status (success, fail, canceled)
 * - Provides a retry() function to reset and restart polling
 *
 * Validates: Requirements 3.1, 3.6, 4.4, 8.6
 */
export function useAiJobPolling(jobId: string | null): UseAiJobPollingResult {
  const [status, setStatus] = useState<AiJobStatus | null>(null);
  const [data, setData] = useState<AiJobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Use refs to track mutable state across intervals without causing re-renders
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIntervalMs = useRef<number>(INITIAL_INTERVAL_MS);
  const retryTrigger = useRef<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);

  /**
   * Clear any active polling timeout.
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Reset state and restart polling.
   */
  const retry = useCallback(() => {
    stopPolling();
    setStatus(null);
    setData(null);
    setError(null);
    setIsLoading(false);
    currentIntervalMs.current = INITIAL_INTERVAL_MS;
    retryTrigger.current += 1;
    setRetryCount((c) => c + 1);
  }, [stopPolling]);

  useEffect(() => {
    // If no jobId, reset everything
    if (!jobId) {
      stopPolling();
      setStatus(null);
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    currentIntervalMs.current = INITIAL_INTERVAL_MS;

    const poll = async () => {
      if (cancelled) return;

      try {
        const response = await aiApi.getAiJob(jobId);
        if (cancelled) return;

        const jobData = response.data.data;
        setData(jobData);
        setStatus(jobData.status);

        if (jobData.status === 'fail') {
          setError(jobData.errorMessage ?? 'AI job failed');
          setIsLoading(false);
          return; // Stop polling
        }

        if (TERMINAL_STATUSES.has(jobData.status)) {
          setIsLoading(false);
          return; // Stop polling
        }

        // Schedule next poll with exponential backoff
        const nextInterval = Math.min(
          currentIntervalMs.current * BACKOFF_FACTOR,
          MAX_INTERVAL_MS,
        );
        currentIntervalMs.current = nextInterval;

        intervalRef.current = setTimeout(() => {
          if (!cancelled) {
            poll();
          }
        }, nextInterval);
      } catch (err: unknown) {
        if (cancelled) return;

        const message =
          err instanceof Error ? err.message : 'Failed to fetch AI job status';
        setError(message);
        setIsLoading(false);
      }
    };

    // Start first poll immediately
    poll();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [jobId, retryCount, stopPolling]);

  return { status, data, error, isLoading, retry };
}
