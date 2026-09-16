import React, { useState, useEffect, useCallback } from 'react';

interface UseAutoRefreshOptions {
  defaultInterval?: number;
  enabled?: boolean;
  onRefresh?: () => void;
}

interface UseAutoRefreshReturn {
  interval: number;
  isEnabled: boolean;
  setInterval: (interval: number) => void;
  toggleEnabled: () => void;
  lastRefresh: Date | null;
  nextRefresh: Date | null;
  triggerRefresh: () => void;
}

export function useAutoRefresh(options: UseAutoRefreshOptions = {}): UseAutoRefreshReturn {
  const { defaultInterval = 30, enabled = true, onRefresh } = options;
  
  const [interval, setIntervalState] = useState(defaultInterval);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const onRefreshRef = React.useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setInterval = useCallback((newInterval: number) => {
    setIntervalState(newInterval);
  }, []);

  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setLastRefresh(new Date());
    if (onRefreshRef.current) onRefreshRef.current();
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (!isEnabled || interval <= 0) return;

    const timer = setInterval(() => {
      triggerRefresh();
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [isEnabled, interval, triggerRefresh]);

  const nextRefresh = isEnabled && interval > 0 && lastRefresh
    ? new Date(lastRefresh.getTime() + interval * 1000)
    : null;

  return {
    interval,
    isEnabled,
    setInterval,
    toggleEnabled,
    lastRefresh,
    nextRefresh,
    triggerRefresh,
  };
}