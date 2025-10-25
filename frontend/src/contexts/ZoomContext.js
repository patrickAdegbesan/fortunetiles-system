import React, { createContext, useState, useEffect, useCallback } from 'react';

export const ZoomContext = createContext();

export const ZoomProvider = ({ children }) => {
  const [zoomLevel, setZoomLevel] = useState(0.85); // Default 85%
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize zoom from localStorage on mount
  useEffect(() => {
    const savedZoom = localStorage.getItem('preferredZoom');
    if (savedZoom) {
      const parsedZoom = parseFloat(savedZoom);
      setZoomLevel(parsedZoom);
      applyZoom(parsedZoom);
    } else {
      // Apply default zoom
      applyZoom(0.85);
    }
    setIsInitialized(true);
  }, []);

  const applyZoom = useCallback((zoom) => {
    // Clamp zoom level between 0.5 (50%) and 1.5 (150%)
    const clampedZoom = Math.max(0.5, Math.min(1.5, zoom));
    
    // Apply using CSS zoom property (more compatible than transform: scale)
    document.documentElement.style.zoom = clampedZoom;
    
    // Also set as fallback for Firefox and older browsers using transform
    document.documentElement.style.transformOrigin = 'top left';
    
    // Store the actual zoom value applied
    setZoomLevel(clampedZoom);
    localStorage.setItem('preferredZoom', clampedZoom);
  }, []);

  const increaseZoom = useCallback(() => {
    const newZoom = zoomLevel + 0.05;
    applyZoom(newZoom);
  }, [zoomLevel, applyZoom]);

  const decreaseZoom = useCallback(() => {
    const newZoom = zoomLevel - 0.05;
    applyZoom(newZoom);
  }, [zoomLevel, applyZoom]);

  const resetZoom = useCallback(() => {
    applyZoom(0.85);
  }, [applyZoom]);

  const setCustomZoom = useCallback((zoom) => {
    const numZoom = parseFloat(zoom);
    if (!isNaN(numZoom)) {
      applyZoom(numZoom);
    }
  }, [applyZoom]);

  const value = {
    zoomLevel,
    increaseZoom,
    decreaseZoom,
    resetZoom,
    setCustomZoom,
    isInitialized
  };

  return (
    <ZoomContext.Provider value={value}>
      {children}
    </ZoomContext.Provider>
  );
};

export const useZoom = () => {
  const context = React.useContext(ZoomContext);
  if (!context) {
    throw new Error('useZoom must be used within a ZoomProvider');
  }
  return context;
};
