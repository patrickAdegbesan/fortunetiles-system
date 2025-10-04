import React from 'react';
import LazyLoad from 'react-lazyload';

// Optimized image component with lazy loading
const OptimizedImage = ({ src, alt, className, height = 200, once = true, placeholder = true }) => {
  // Placeholder while image loads
  const renderPlaceholder = () => {
    return (
      <div 
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      ></div>
    );
  };

  return (
    <LazyLoad 
      height={height} 
      once={once} 
      placeholder={placeholder ? renderPlaceholder() : null}
      debounce={100}
    >
      <img 
        src={src} 
        alt={alt || 'Product Image'} 
        className={className}
        loading="lazy"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = '/placeholder.svg';
        }} 
      />
    </LazyLoad>
  );
};

export default OptimizedImage;