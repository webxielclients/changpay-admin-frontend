'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  initialTime: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

export function useTimer({
  initialTime,
  onComplete,
  autoStart = true,
}: UseTimerOptions) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setTimeLeft(initialTime);
    setIsRunning(autoStart);
  }, [initialTime, autoStart]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, onComplete]);

  return {
    timeLeft,
    isRunning,
    start,
    pause,
    reset,
  };
}