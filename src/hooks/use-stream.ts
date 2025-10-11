
"use client";

import { useState, useCallback, useRef } from 'react';
import type { RankedCandidate } from '@/lib/types';

/**
 * Defines the shape of the data returned by the useStream hook.
 */
interface UseStreamReturn {
  stream: RankedCandidate[];
  isStreaming: boolean;
  error: string | null;
  startStream: (input: any) => Promise<void>;
  resetStream: () => void;
}

/**
 * A custom hook to handle streaming data from a server action.
 * @param {((input: any) => AsyncGenerator<RankedCandidate, void, unknown>)} action - The server action that returns an async generator.
 * @returns {UseStreamReturn} An object containing the stream state and control functions.
 */
export function useStream(
  action: (input: any) => Promise<any>
): UseStreamReturn {
  const [stream, setStream] = useState<RankedCandidate[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track the "session" of the current stream to prevent race conditions.
  const streamSessionRef = useRef(0);

  /**
   * Resets the stream state to its initial values.
   */
  const resetStream = useCallback(() => {
    setStream([]);
    setError(null);
    setIsStreaming(false);
    streamSessionRef.current += 1; // Invalidate previous stream sessions
  }, []);
  
  /**
   * Starts the streaming process.
   * @param {any} input - The input to be passed to the server action.
   */
  const startStream = useCallback(async (input: any) => {
    const currentSession = streamSessionRef.current;
    
    // Reset state for a new stream.
    setStream([]);
    setError(null);
    setIsStreaming(true);

    try {
      const streamGenerator = action(input);
      let streamedData: RankedCandidate[] = [];
      
      for await (const chunk of streamGenerator) {
        // If the session has changed, it means a new stream has started, so stop this one.
        if (streamSessionRef.current !== currentSession) {
          console.log("[useStream DEBUG] Stale stream detected, abandoning.");
          return;
        }
        
        // Update the local array and then set the state.
        streamedData = [...streamedData, chunk];
        setStream(streamedData);
      }
    } catch (e: any) {
       console.error("[useStream DEBUG] Error during stream consumption:", e);
      const errorMessage = e.message || "An unknown error occurred during streaming.";
      setError(errorMessage);
    } finally {
      // Only set streaming to false if this is the currently active session.
      if (streamSessionRef.current === currentSession) {
        setIsStreaming(false);
      }
    }
  }, [action]);

  return { stream, isStreaming, error, startStream, resetStream };
}
