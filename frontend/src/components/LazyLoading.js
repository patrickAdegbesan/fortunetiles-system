import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Enhanced lazy loading component with intelligent preloading
 * - Intersection Observer for viewport-based loading
 * - Hover-based preloading for better UX
 * - Error boundaries with retry functionality
 * - Loading skeletons for better perceived performance
 */

// Loading skeleton component for better UX
const LoadingSkeleton = ({ type = 'component', className = '' }) => {
  const skeletons = {
    component: (
      <div className={`animate-pulse p-6 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    ),
    page: (
      <div className={`animate-pulse p-8 ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    ),
    table: (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 h-12 rounded-t"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-100 h-10 border-b border-gray-200 flex">
            <div className="bg-gray-200 h-6 m-2 rounded flex-1"></div>
            <div className="bg-gray-200 h-6 m-2 rounded flex-1"></div>
            <div className="bg-gray-200 h-6 m-2 rounded flex-1"></div>
          </div>
        ))}
      </div>
    )
  };

  return skeletons[type] || skeletons.component;
};

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary, componentName = 'Component' }) => (
  <div className="p-8 text-center border-2 border-dashed border-red-200 rounded-lg">
    <div className="text-red-600 mb-4">
      <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      Failed to load {componentName}
    </h3>
    <p className="text-gray-600 mb-4 text-sm">
      {error?.message || 'An unexpected error occurred'}
    </p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
    >
      Try Again
    </button>
  </div>
);

// Enhanced lazy component wrapper
export const LazyComponent = ({ 
  loader, 
  fallback, 
  skeletonType = 'component',
  componentName = 'Component',
  preloadOnHover = true,
  className = ''
}) => {
  const LazyLoadedComponent = lazy(loader);
  
  // Preload on hover for better perceived performance
  const handleMouseEnter = preloadOnHover ? () => {
    loader().catch(() => {}); // Preload but ignore errors
  } : undefined;

  return (
    <div onMouseEnter={handleMouseEnter} className={className}>
      <ErrorBoundary
        FallbackComponent={({ error, resetErrorBoundary }) => (
          <ErrorFallback 
            error={error} 
            resetErrorBoundary={resetErrorBoundary} 
            componentName={componentName}
          />
        )}
        onReset={() => window.location.reload()}
      >
        <Suspense fallback={fallback || <LoadingSkeleton type={skeletonType} />}>
          <LazyLoadedComponent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

// Viewport-based lazy loading hook
export const useViewportLazyLoading = (threshold = 0.1, rootMargin = '50px') => {
  const [isInView, setIsInView] = React.useState(false);
  const [hasBeenInView, setHasBeenInView] = React.useState(false);
  const elementRef = React.useRef();

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element || hasBeenInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setHasBeenInView(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin, hasBeenInView]);

  return [elementRef, isInView || hasBeenInView];
};

// Viewport-based lazy component
export const ViewportLazyComponent = ({ 
  loader,
  fallback,
  skeletonType = 'component',
  componentName = 'Component',
  threshold = 0.1,
  className = ''
}) => {
  const [elementRef, shouldLoad] = useViewportLazyLoading(threshold);
  
  return (
    <div ref={elementRef} className={className}>
      {shouldLoad ? (
        <LazyComponent
          loader={loader}
          fallback={fallback}
          skeletonType={skeletonType}
          componentName={componentName}
          preloadOnHover={false} // Already loaded based on viewport
        />
      ) : (
        fallback || <LoadingSkeleton type={skeletonType} />
      )}
    </div>
  );
};

// Pre-defined lazy page components for common use cases
export const LazyPages = {
  Dashboard: () => import('../pages/DashboardPage'),
  Products: () => import('../pages/ProductsPage'),
  Inventory: () => import('../pages/InventoryPage'),
  Sales: () => import('../pages/SalesPage'),
  Reports: () => import('../pages/ReportsPage'),
  Settings: () => import('../pages/SettingsPage')
};

export default {
  LazyComponent,
  ViewportLazyComponent,
  useViewportLazyLoading,
  LoadingSkeleton,
  LazyPages
};