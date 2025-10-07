import React, { useState, useEffect, useCallback } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

/**
 * Real-time performance monitoring component
 * Tracks Core Web Vitals and custom metrics
 */
const PerformanceMonitor = ({ 
  enabled = process.env.NODE_ENV === 'development',
  showWidget = false,
  onMetric = null 
}) => {
  const [metrics, setMetrics] = useState({
    CLS: null,   // Cumulative Layout Shift
    FID: null,   // First Input Delay
    FCP: null,   // First Contentful Paint
    LCP: null,   // Largest Contentful Paint
    TTFB: null   // Time to First Byte
  });

  const [customMetrics, setCustomMetrics] = useState({
    apiResponseTime: [],
    renderTime: null,
    memoryUsage: null,
    connectionSpeed: null
  });

  const [isVisible, setIsVisible] = useState(showWidget);

  // Record Web Vitals
  useEffect(() => {
    if (!enabled) return;

    const recordMetric = (metric) => {
      setMetrics(prev => ({
        ...prev,
        [metric.name]: metric.value
      }));

      if (onMetric) {
        onMetric(metric);
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        // Example: Google Analytics 4
        if (window.gtag) {
          window.gtag('event', metric.name, {
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            custom_parameter_1: metric.rating,
          });
        }
      }
    };

    getCLS(recordMetric);
    getFID(recordMetric);
    getFCP(recordMetric);
    getLCP(recordMetric);
    getTTFB(recordMetric);
  }, [enabled, onMetric]);

  // Monitor API performance
  const recordApiMetric = useCallback((url, duration, success = true) => {
    if (!enabled) return;

    setCustomMetrics(prev => ({
      ...prev,
      apiResponseTime: [
        ...prev.apiResponseTime.slice(-19), // Keep last 20 measurements
        { url, duration, success, timestamp: Date.now() }
      ]
    }));
  }, [enabled]);

  // Monitor memory usage
  useEffect(() => {
    if (!enabled || !performance.memory) return;

    const updateMemoryUsage = () => {
      setCustomMetrics(prev => ({
        ...prev,
        memoryUsage: {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          percentage: Math.round((performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100)
        }
      }));
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, [enabled]);

  // Monitor connection speed
  useEffect(() => {
    if (!enabled || !navigator.connection) return;

    const updateConnection = () => {
      setCustomMetrics(prev => ({
        ...prev,
        connectionSpeed: {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
          saveData: navigator.connection.saveData
        }
      }));
    };

    updateConnection();
    navigator.connection.addEventListener('change', updateConnection);
    return () => navigator.connection.removeEventListener('change', updateConnection);
  }, [enabled]);

  // Format metric values for display
  const formatMetric = (name, value) => {
    if (value === null) return 'Measuring...';
    
    switch (name) {
      case 'CLS':
        return value.toFixed(3);
      case 'FID':
      case 'FCP':
      case 'LCP':
      case 'TTFB':
        return `${Math.round(value)}ms`;
      default:
        return value;
    }
  };

  // Get metric color based on performance thresholds
  const getMetricColor = (name, value) => {
    if (value === null) return 'text-gray-400';
    
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[name];
    if (!threshold) return 'text-gray-600';

    if (value <= threshold.good) return 'text-green-600';
    if (value <= threshold.poor) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calculate average API response time
  const avgApiResponseTime = customMetrics.apiResponseTime.length > 0
    ? Math.round(customMetrics.apiResponseTime.reduce((sum, m) => sum + m.duration, 0) / customMetrics.apiResponseTime.length)
    : null;

  if (!enabled) return null;

  // Performance widget overlay
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg z-50 hover:bg-blue-700 transition-colors"
        title="Show Performance Monitor"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl z-50 w-80 max-h-96 overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Performance Monitor</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Core Web Vitals */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Core Web Vitals</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(metrics).map(([name, value]) => (
              <div key={name} className="flex justify-between">
                <span className="text-gray-600">{name}:</span>
                <span className={getMetricColor(name, value)}>
                  {formatMetric(name, value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* API Performance */}
        {avgApiResponseTime && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">API Performance</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Response:</span>
                <span className={avgApiResponseTime > 500 ? 'text-red-600' : avgApiResponseTime > 200 ? 'text-yellow-600' : 'text-green-600'}>
                  {avgApiResponseTime}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="text-gray-900">
                  {Math.round(customMetrics.apiResponseTime.filter(m => m.success).length / customMetrics.apiResponseTime.length * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Memory Usage */}
        {customMetrics.memoryUsage && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Memory Usage</h4>
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Used:</span>
                <span className={customMetrics.memoryUsage.percentage > 80 ? 'text-red-600' : 'text-gray-900'}>
                  {Math.round(customMetrics.memoryUsage.used / 1048576)}MB ({customMetrics.memoryUsage.percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${customMetrics.memoryUsage.percentage > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${customMetrics.memoryUsage.percentage}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Connection Speed */}
        {customMetrics.connectionSpeed && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Connection</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="text-gray-900">{customMetrics.connectionSpeed.effectiveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Speed:</span>
                <span className="text-gray-900">{customMetrics.connectionSpeed.downlink} Mbps</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook to track API performance
export const usePerformanceTracking = () => {
  const recordApiCall = useCallback(async (url, apiCall) => {
    const startTime = performance.now();
    let success = true;
    
    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      
      // Dispatch custom event for the monitor
      window.dispatchEvent(new CustomEvent('api-performance', {
        detail: { url, duration, success }
      }));
    }
  }, []);

  return { recordApiCall };
};

export default PerformanceMonitor;