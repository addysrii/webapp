// src/services/api.js - Web version for React + Vite
import axios from 'axios';

// Choose API URL based on environment
// const getApiUrl = () => {
//   console.log(`Environment: ${import.meta.env.MODE}`);
  
//   if (import.meta.env.MODE === 'development') {
//     return import.meta.env.VITE_DEV_API_URL || 'http://localhost:3000';
//   }
  
//   return import.meta.env.VITE_API_URL || 'https://new-backend-w86d.onrender.com';
// };

const API_URL = 'https://new-backend-w86d.onrender.com';
console.log(`API URL: ${API_URL}`);

// Function to test connection with error handling
export const testConnection = async () => {
  try {
    if (!navigator.onLine) {
      console.log('Browser reports no internet connection');
      return {
        success: false,
        error: 'No internet connection',
        networkState: 'disconnected'
      };
    }
    
    console.log(`Testing connection to ${API_URL}/health...`);
    const response = await axios.get(`${API_URL}/health`, { 
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    console.log('Connection test response:', response.status, response.data);
    return {
      success: response.status === 200,
      data: response.data,
      networkState: 'connected'
    };
  } catch (error) {
    console.error('Connection test failed:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
      return {
        success: false,
        error: `Server error: ${error.response.status}`,
        details: error.response.data,
        networkState: 'connected-but-server-error'
      };
    }
    
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Connection timeout',
        networkState: 'timeout'
      };
    }
    
    return {
      success: false,
      error: error.message,
      networkState: 'unknown-error'
    };
  }
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 60000 // 60 seconds default timeout
});

// Check server connection health
export const checkServerConnection = async () => {
  try {
    if (!navigator.onLine) {
      return {
        success: false,
        error: 'No internet connection'
      };
    }
    
    const response = await axios.get(`${API_URL}/health`, { 
      timeout: 5000,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    return {
      success: response.status === 200,
      data: response.data
    };
  } catch (error) {
    console.warn('API server may be unreachable:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Request interceptor to add auth token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      // For file uploads, increase timeout and set proper headers
      if (config.headers['Content-Type'] === 'multipart/form-data') {
        config.timeout = 180000; // 3 minutes timeout for file uploads
        delete config.headers['Content-Type'];
      }
      
      const token = localStorage.getItem('@auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Added auth token to request');
      } else {
        console.warn('No auth token found for request');
      }
      
      // Log request for debugging
      console.log(`Request to ${config.url}: ${config.method.toUpperCase()}`, 
        config.data instanceof FormData ? 'FormData' : config.data);
      
      // Log FormData contents if applicable
      if (config.data instanceof FormData) {
        console.log('FormData contents:');
        for (let pair of config.data.entries()) {
          if (typeof pair[1] === 'object' && pair[1] !== null) {
            console.log(pair[0], 'File object:', pair[1].name || 'No name available');
          } else {
            console.log(pair[0], pair[1]);
          }
        }
      }
      
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with error handling
api.interceptors.response.use(
  (response) => {
    // Log success response
    console.log(`Response from ${response.config.url}: ${response.status}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.log('API Error:', error.response?.status, error.message);
    
    // Log more detailed error information
    if (error.response) {
      console.log('Error response data:', error.response.data);
      console.log('Error response headers:', error.response.headers);
    }
    
    // Check for network errors specifically
    if (error.message === 'Network Error') {
      console.error('Network error detected - server may be unreachable');
      
      // Check internet connectivity first
      if (!navigator.onLine) {
        return Promise.reject(new Error('No internet connection. Please check your network and try again.'));
      }
      
      // Check if server is reachable
      const isServerUp = await checkServerConnection();
      if (!isServerUp.success) {
        return Promise.reject(new Error('Server is currently unreachable. Please try again later.'));
      }
    }
    
    // If error is timeout
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out - may be due to large file uploads or slow network');
      return Promise.reject(new Error('Request timed out. This might be due to large file uploads or slow network connection.'));
    }
    
    // If error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('Attempting token refresh...');
      originalRequest._retry = true;
      
      try {
        // Get refresh token
        const refreshToken = localStorage.getItem('@refresh_token');
        
        if (!refreshToken) {
          console.log('No refresh token available');
          throw new Error('No refresh token available');
        }
        
        // Call refresh token endpoint
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken
        });
        
        if (!response.data.token) {
          throw new Error('Invalid refresh response');
        }
        
        // Store new tokens
        const { token, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('@auth_token', token);
        
        if (newRefreshToken) {
          localStorage.setItem('@refresh_token', newRefreshToken);
        }
        
        console.log('Token refreshed successfully');
        
        // Update auth header and retry
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // If refresh fails, clear tokens
        localStorage.removeItem('@auth_token');
        localStorage.removeItem('@refresh_token');
        localStorage.removeItem('@user_data');
        
        // Add a custom error property to indicate auth failure
        error.isAuthError = true;
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };