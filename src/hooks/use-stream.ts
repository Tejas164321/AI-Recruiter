
"use client";

import { useState, useCallback, useRef } from 'react';

/**
 * Defines the properties for the useStream hook.
 * @template T - The type of data chunks received from the stream.
 */
interface UseStreamProps<T> {
  onDone?: (finalStreamedData: T[]) => void; // Callback when the stream is complete.
  onError?: (error: any) => void; // Callback for any errors during streaming.
}

/**
 * A custom hook to manage and consume a ReadableStream from a server action (generator function).
 * It handles the state for streaming data, loading status, and errors.
 *
 * @template T - The type of data chunks expected from the stream.
 * @param {UseStreamProps<T>} props - Configuration props for the hook.
 * @returns An object with the stream state and control functions.
 */
export function useStream<T>({ onDone, onError }: UseStreamProps<T> = {}) {
  const [stream, setStream] = useState<T[]>([]); // Holds the array of data chunks received so far.
  const [isStreaming, setIsStreaming] = useState(false); // True while the stream is active.
  const [error, setError] = useState<any>(null); // Holds any error that occurs.

  // Use a ref to keep track of the stream controller to prevent race conditions
  const streamControllerRef = useRef(0);

  /**
   * Clears the stream state, resetting it to its initial values.
   */
  const resetStream = useCallback(() => {
    setStream([]);
    setIsStreaming(false);
    setError(null);
    streamControllerRef.current += 1; // Invalidate previous streams
  }, []);

  /**
   * Starts consuming the stream from the provided server action.
   * @template I - The input type for the server action.
   * @param {(input: I) => AsyncGenerator<T, void, unknown>} action - The async generator server action.
   * @param {I} input - The input to pass to the server action.
   */
  const startStream = useCallback(async <I>(
    action: (input: I) => AsyncGenerator<T, void, unknown>,
    input: I
  ) => {
    const currentStreamId = ++streamControllerRef.current;
    
    // Set loading state immediately.
    setIsStreaming(true);
    setStream([]);
    setError(null);
    
    const finalStreamedData: T[] = [];
    try {
      // Loop through the async generator
      for await (const chunk of action(input)) {
        // If a new stream has been started, abort this one.
        if (streamControllerRef.current !== currentStreamId) {
            console.log("Aborting stale stream.");
            return;
        }
        
        // Append the new chunk to our local array and update the state
        finalStreamedData.push(chunk);
        setStream([...finalStreamedData]); // Update state with a new array to trigger re-render
      }

      // If the stream completed without being aborted, call onDone.
      if (streamControllerRef.current === currentStreamId) {
        onDone?.(finalStreamedData);
      }
    } catch (e) {
      console.error("Error during stream consumption:", e);
      if (streamControllerRef.current === currentStreamId) {
        setError(e);
        onError?.(e);
      }
    } finally {
      // Only stop streaming if this is the currently active stream.
      if (streamControllerRef.current === currentStreamId) {
        setIsStreaming(false);
      }
    }
  }, [onDone, onError]);

  return { stream, isStreaming, error, startStream, resetStream };
}
