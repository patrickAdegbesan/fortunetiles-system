const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

/**
 * Advanced Webpack optimization configuration for Fortune Tiles
 * Phase 4: Frontend performance enhancements
 * - Code splitting with intelligent chunks
 * - Tree shaking for smaller bundles
 * - Compression and minification
 * - Bundle analysis and monitoring
 */

const isProduction = process.env.NODE_ENV === 'production';
const shouldAnalyze = process.env.ANALYZE_BUNDLE === 'true';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  
  entry: {
    main: './src/index.js',
    // Separate vendor chunk for libraries that change less frequently
    vendor: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      '@tanstack/react-query'
    ]
  },

  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction,
            drop_debugger: isProduction,
            pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : []
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false
          }
        },
        extractComments: false,
        parallel: true
      })
    ],

    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries (React, etc.)
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 20,
          reuseExistingChunk: true
        },
        
        // Common components used across multiple pages
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true,
          enforce: true
        },

        // Large libraries that should be separate
        charts: {
          test: /[\\/]node_modules[\\/](recharts|chart\.js|react-chartjs-2)[\\/]/,
          name: 'charts',
          chunks: 'all',
          priority: 30
        },

        // UI component libraries
        ui: {
          test: /[\\/]node_modules[\\/](@headlessui|@heroicons|react-icons)[\\/]/,
          name: 'ui-components',
          chunks: 'all',
          priority: 25
        },

        // Date/time libraries
        datetime: {
          test: /[\\/]node_modules[\\/](date-fns|moment|dayjs)[\\/]/,
          name: 'datetime',
          chunks: 'all',
          priority: 15
        }
      }
    },

    // Runtime chunk for better long-term caching
    runtimeChunk: {
      name: 'runtime'
    },

    // Module concatenation for better tree shaking
    concatenateModules: isProduction,

    // Remove empty chunks
    removeEmptyChunks: true,

    // Merge duplicate chunks
    mergeDuplicateChunks: true
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@assets': path.resolve(__dirname, 'src/assets')
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },

  module: {
    rules: [
      // JavaScript/React files
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { 
                  useBuiltIns: 'entry',
                  corejs: 3,
                  modules: false // Let webpack handle modules
                }],
                ['@babel/preset-react', { runtime: 'automatic' }]
              ],
              plugins: [
                // Lazy loading and code splitting
                '@babel/plugin-syntax-dynamic-import',
                
                // Remove prop-types in production
                ...(isProduction ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : [])
              ],
              cacheDirectory: true
            }
          }
        ]
      },

      // CSS files with optimization
      {
        test: /\.css$/,
        use: [
          isProduction ? 'mini-css-extract-plugin' : 'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName: isProduction ? '[hash:base64:8]' : '[name]__[local]--[hash:base64:5]'
              }
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  'tailwindcss',
                  'autoprefixer',
                  ...(isProduction ? [
                    ['cssnano', {
                      preset: ['default', {
                        discardComments: { removeAll: true },
                        normalizeWhitespace: true
                      }]
                    }]
                  ] : [])
                ]
              }
            }
          }
        ]
      },

      // Images with optimization
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8kb
          }
        },
        generator: {
          filename: 'assets/images/[name].[contenthash:8][ext]'
        }
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[contenthash:8][ext]'
        }
      }
    ]
  },

  plugins: [
    // Compression for production
    ...(isProduction ? [
      new CompressionPlugin({
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 8192,
        minRatio: 0.8
      }),
      
      // Brotli compression for modern browsers
      new CompressionPlugin({
        filename: '[path][base].br',
        algorithm: 'brotliCompress',
        test: /\.(js|css|html|svg)$/,
        compressionOptions: {
          level: 11
        },
        threshold: 8192,
        minRatio: 0.8
      })
    ] : []),

    // Bundle analyzer
    ...(shouldAnalyze ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'bundle-report.html'
      })
    ] : [])
  ],

  // Performance budgets
  performance: {
    maxEntrypointSize: 512000, // 500kb
    maxAssetSize: 512000,
    hints: isProduction ? 'error' : 'warning',
    assetFilter: (assetFilename) => {
      // Only check JS and CSS files
      return /\.(js|css)$/.test(assetFilename);
    }
  },

  // Source maps
  devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',

  // Dev server configuration
  devServer: {
    hot: true,
    compress: true,
    historyApiFallback: true,
    open: false,
    port: 3000,
    
    // Proxy API calls to backend
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:5000',
        ws: true,
        changeOrigin: true
      }
    }
  },

  // Cache configuration for faster rebuilds
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },

  // Experiments for future features
  experiments: {
    topLevelAwait: true
  }
};

// Additional production optimizations
if (isProduction) {
  module.exports.optimization.usedExports = true;
  module.exports.optimization.sideEffects = false;
  
  // Add mini-css-extract-plugin
  const MiniCssExtractPlugin = require('mini-css-extract-plugin');
  module.exports.plugins.unshift(
    new MiniCssExtractPlugin({
      filename: 'assets/css/[name].[contenthash:8].css',
      chunkFilename: 'assets/css/[name].[contenthash:8].css'
    })
  );
}