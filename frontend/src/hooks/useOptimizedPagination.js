import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Advanced infinite scroll hook with performance optimizations
 * - Intersection Observer for efficient scroll detection
 * - Debounced loading to prevent excessive API calls  
 * - Error handling and retry logic
 * - Loading state management
 */
export const useInfiniteScroll = ({
  loadMore,
  hasMore = true,
  threshold = 1.0,
  debounceMs = 300,
  retryAttempts = 3
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const observerRef = useRef();
  const timeoutRef = useRef();

  // Debounced load function to prevent rapid-fire requests
  const debouncedLoad = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      setError(null);
      
      await loadMore();
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      console.error('Infinite scroll load error:', err);
      setError(err.message || 'Failed to load more items');
      
      // Retry logic
      if (retryCount < retryAttempts) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => debouncedLoad(), 1000 * Math.pow(2, retryCount)); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, loadMore, retryCount, retryAttempts]);

  // Intersection Observer callback
  const observerCallback = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loading) {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Debounce the load call
      timeoutRef.current = setTimeout(debouncedLoad, debounceMs);
    }
  }, [hasMore, loading, debouncedLoad, debounceMs]);

  // Set up intersection observer
  const lastElementRef = useCallback((node) => {
    if (loading) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    if (node) {
      observerRef.current = new IntersectionObserver(observerCallback, {
        threshold,
        rootMargin: '100px' // Load slightly before reaching the bottom
      });
      observerRef.current.observe(node);
    }
  }, [loading, observerCallback, threshold]);

  // Cleanup on unmount
  useEffect(() => {
    const currentObserver = observerRef.current;
    const currentTimeout = timeoutRef.current;
    
    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
      }
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    };
  }, []);

  // Manual retry function
  const retry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    debouncedLoad();
  }, [debouncedLoad]);

  return {
    loading,
    error,
    lastElementRef,
    retry,
    retryCount
  };
};

/**
 * Optimized pagination hook with caching and prefetching
 */
export const usePagination = ({
  fetchPage,
  pageSize = 10,
  prefetchNext = true,
  cachePages = true,
  maxCacheSize = 5
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const cacheRef = useRef(new Map());

  // Fetch page with caching
  const fetchPageData = useCallback(async (page) => {
    const cacheKey = `page_${page}`;
    
    // Return cached data if available
    if (cachePages && cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey);
    }

    try {
      const response = await fetchPage(page, pageSize);
      
      // Cache the response
      if (cachePages) {
        // Implement LRU cache by removing oldest entries
        if (cacheRef.current.size >= maxCacheSize) {
          const firstKey = cacheRef.current.keys().next().value;
          cacheRef.current.delete(firstKey);
        }
        cacheRef.current.set(cacheKey, response);
      }
      
      return response;
    } catch (err) {
      throw new Error(`Failed to fetch page ${page}: ${err.message}`);
    }
  }, [fetchPage, pageSize, cachePages, maxCacheSize]);

  // Load specific page
  const loadPage = useCallback(async (page) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchPageData(page);
      
      setData(response.data || []);
      setTotalPages(response.totalPages || 0);
      setTotalItems(response.totalItems || 0);
      setCurrentPage(page);

      // Prefetch next page in background
      if (prefetchNext && page < response.totalPages) {
        setTimeout(() => fetchPageData(page + 1), 100);
      }
      
    } catch (err) {
      console.error('Pagination load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchPageData, prefetchNext]);

  // Navigation helpers
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      loadPage(page);
    }
  }, [loadPage, totalPages, currentPage]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [goToPage, currentPage]);

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [goToPage, currentPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  // Initialize by loading first page
  useEffect(() => {
    loadPage(1);
  }, []);

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    refresh: () => loadPage(currentPage)
  };
};

export default { useInfiniteScroll, usePagination };