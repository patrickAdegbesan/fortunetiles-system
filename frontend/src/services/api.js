import axios from 'axios';

const API = axios.create({
  // Use relative path in production (served by the same domain)
  // and allow override via REACT_APP_API_BASE_URL for flexibility
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
});

// Add request interceptor to include token in headers
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const loginUser = async (userData) => {
  try {
    const response = await API.post('/auth/login', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await API.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Registration failed' };
  }
};

// Products API calls
export const fetchProducts = async () => {
  try {
    // Include product type when fetching products
    const response = await API.get('/products', {
      params: {
        include: 'productType'
      }
    });
    console.log('Fetched products with types:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error.response?.data || error);
    throw error.response?.data || { message: 'Failed to fetch products' };
  }
};

export const fetchProductTypes = async () => {
  try {
    const response = await API.get('/products/types');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch product types' };
  }
};

export const createProduct = async (productData) => {
  try {
    const response = await API.post('/products', productData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create product' };
  }
};

export const updateProduct = async (id, productData) => {
  try {
    const response = await API.put(`/products/${id}`, productData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update product' };
  }
};

export const deleteProduct = async (id) => {
  try {
    const response = await API.delete(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error('Delete product API error:', error);
    throw error.response?.data || { message: 'Failed to archive product' };
  }
};

export const fetchProductCategories = async () => {
  try {
    const response = await API.get('/products/categories');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch categories' };
  }
};

// User API calls
export const fetchUsers = async (params = {}) => {
  try {
    const response = await API.get('/users', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch users' };
  }
};

export const fetchUser = async (id) => {
  try {
    const response = await API.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch user' };
  }
};

export const createUser = async (userData) => {
  try {
    const response = await API.post('/users', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create user' };
  }
};

export const updateUser = async (id, userData) => {
  try {
    const response = await API.put(`/users/${id}`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update user' };
  }
};

export const deactivateUser = async (id) => {
  try {
    const response = await API.delete(`/users/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to deactivate user' };
  }
};

export const activateUser = async (id) => {
  try {
    const response = await API.put(`/users/${id}/activate`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to activate user' };
  }
};

export const fetchUserRoles = async () => {
  try {
    const response = await API.get('/users/roles');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch roles' };
  }
};

// Reports API calls
export const fetchSalesDailyReport = async (params = {}) => {
  try {
    const response = await API.get('/reports/sales-daily', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch daily sales report' };
  }
};

export const fetchInventoryValuationReport = async (params = {}) => {
  try {
    const response = await API.get('/reports/inventory-valuation', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch inventory valuation report' };
  }
};

export const fetchProfitMarginReport = async (params = {}) => {
  try {
    const response = await API.get('/reports/profit-margin', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch profit margin report' };
  }
};

export const fetchTopProductsReport = async (params = {}) => {
  try {
    const response = await API.get('/reports/top-products', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch top products report' };
  }
};

// Inventory API calls
export const fetchInventory = async (filters = {}) => {
  try {
    const response = await API.get('/inventory', { 
      params: filters
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch inventory' };
  }
};

export const logInventoryChange = async (changeData) => {
  try {
    const response = await API.post('/inventory/log', changeData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to log inventory change' };
  }
};

export const fetchInventoryLogs = async (filters = {}) => {
  try {
    const response = await API.get('/inventory/logs', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch inventory logs' };
  }
};

// Sales API calls (updated versions)

export const fetchSale = async (id) => {
  try {
    const response = await API.get(`/sales/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch sale' };
  }
};

// Locations API calls
export const fetchLocations = async () => {
  try {
    const response = await API.get('/locations');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch locations' };
  }
};

export const createLocation = async (locationData) => {
  try {
    const response = await API.post('/locations', locationData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create location' };
  }
};

export const updateLocation = async (id, locationData) => {
  try {
    const response = await API.put(`/locations/${id}`, locationData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update location' };
  }
};

export const deleteLocation = async (id) => {
  try {
    const response = await API.delete(`/locations/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete location' };
  }
};

// Dashboard API calls
export const fetchDashboardData = async (locationId = null) => {
  try {
    const params = locationId ? { locationId } : {};
    const response = await API.get('/dashboard', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch dashboard data' };
  }
};

export const fetchDashboardStats = async () => {
  try {
    const response = await API.get('/dashboard');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch dashboard stats' };
  }
};

export const fetchLowStockItems = async (threshold = 100) => {
  try {
    const response = await API.get(`/inventory/low-stock?threshold=${threshold}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch low stock items' };
  }
};

// Sales API
export const createSale = async (saleData) => {
  try {
    console.log('Creating sale with data:', JSON.stringify(saleData, null, 2));
    const response = await API.post('/sales', saleData);
    console.log('Sale creation response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Sale creation error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      stack: error.stack
    });
    
    if (error.response?.data) {
      throw error.response.data;
    }
    // If it's a network error, it won't have response data
    if (error.message === 'Network Error') {
      throw { message: 'Cannot connect to server. Please check your internet connection.' };
    }
    throw { message: error.message || 'Failed to create sale' };
  }
};

export const fetchSales = async (locationId = null, limit = 50) => {
  try {
    const params = new URLSearchParams();
    if (locationId) params.append('locationId', locationId);
    params.append('limit', limit);
    
    const response = await API.get(`/sales?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch sales' };
  }
};

export const fetchSaleById = async (saleId) => {
  try {
    const response = await API.get(`/sales/${saleId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch sale details' };
  }
};

export default API;
