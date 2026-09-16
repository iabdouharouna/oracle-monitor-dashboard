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
  
  const [interval, setIntervalValue] = useState(defaultInterval);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const onRefreshRef = React.useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setInterval = useCallback((newInterval: number) => {
    setIntervalValue(newInterval);
  }, []);

  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  const triggerRefresh = useCallback(() => {
    setLastRefresh(new Date());
    if (onRefreshRef.current) onRefreshRef.current();
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (!isEnabled || interval <= 0) return;

    const timer = window.setInterval(() => {
      triggerRefresh();
    }, interval * 1000);

    return () => window.clearInterval(timer);
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