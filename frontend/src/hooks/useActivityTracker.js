import { useEffect, useRef, useCallback } from 'react';

const useActivityTracker = (onInactive, timeoutMs = 30 * 60 * 1000) => { // 30 minutes default
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onInactive();
    }, timeoutMs);
  }, [onInactive, timeoutMs]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimer();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // When page becomes hidden, pause the timer
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      } else {
        // When page becomes visible, reset timer
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the timer
    resetTimer();

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);

  return {
    resetActivity: resetTimer,
    lastActivity: lastActivityRef.current
  };
};

export default useActivityTracker;