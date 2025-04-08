// src/services/authService.js
import api from './api';

export const authService = {
  // Login with email and password
  login: async (email, password) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    try {
      // Check network connectivity first
      if (!navigator.onLine) {
        throw new Error('No internet connection available');
      }
      
      console.log(`Attempting login for: ${email}`);
      const response = await api.post('/auth/login', { email, password });
      
      if (!response.data || !response.data.token) {
        console.error('Invalid login response:', response.data);
        throw new Error('Invalid response from server');
      }
      
      const { token, refreshToken, user } = response.data;
      
      // Store authentication data
      localStorage.setItem('@auth_token', token);
      localStorage.setItem('@refresh_token', refreshToken);
      localStorage.setItem('@user_data', JSON.stringify(user));
      
      // Set token for future API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('Login successful');
      return { user, source: 'login' };
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      
      // Handle specific error cases with clear messages
      if (!error.response) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid login information');
      } else if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  },
  
  // Register new user
  signup: async (userData) => {
    if (!userData || !userData.email || !userData.password) {
      throw new Error('Email and password are required for signup');
    }
    
    try {
      console.log(`Attempting signup for: ${userData.email}`);
      const response = await api.post('/auth/signup', userData);
      
      if (!response.data || !response.data.token) {
        console.error('Invalid signup response:', response.data);
        throw new Error('Invalid response from server');
      }
      
      const { token, refreshToken, user } = response.data;
      
      // Store authentication data
      localStorage.setItem('@auth_token', token);
      localStorage.setItem('@refresh_token', refreshToken);
      localStorage.setItem('@user_data', JSON.stringify(user));
      
      // Set token for future API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('Signup successful');
      return { user, source: 'signup' };
    } catch (error) {
      console.error('Signup error:', error.response?.data || error.message);
      
      // Handle specific error cases
      if (!error.response) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      if (error.response?.status === 400 && (
        error.response?.data?.error?.includes('exists') || 
        error.response?.data?.error?.includes('already')
      )) {
        throw new Error('An account with this email already exists');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid signup information');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Signup failed. Please try again.');
      }
    }
  },
  
  // Google OAuth login/signup
  googleAuth: async (idToken) => {
    if (!idToken) {
      throw new Error('Google ID token is required');
    }
    
    try {
      console.log('Attempting Google authentication');
      const response = await api.post('/auth/google', { idToken });
      
      if (!response.data || !response.data.token) {
        console.error('Invalid Google auth response:', response.data);
        throw new Error('Invalid response from server');
      }
      
      const { token, refreshToken, user } = response.data;
      
      // Store authentication data
      localStorage.setItem('@auth_token', token);
      localStorage.setItem('@refresh_token', refreshToken);
      localStorage.setItem('@user_data', JSON.stringify(user));
      
      // Set token for future API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('Google authentication successful');
      return { user, source: 'google' };
    } catch (error) {
      console.error('Google auth error:', error.response?.data || error.message);
      
      // Handle specific error cases
      if (!error.response) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid Google token');
      } else if (error.response?.status === 409) {
        throw new Error('An account with this email already exists with a different provider');
      } else if (error.response?.status === 500) {
        throw new Error('Server error during Google authentication. Please try again later.');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('Google authentication failed. Please try again.');
      }
    }
  },
  
  // LinkedIn OAuth login/signup
  linkedinAuth: async (code, redirectUri) => {
    if (!code) {
      throw new Error('LinkedIn authorization code is required');
    }
    
    try {
      console.log('Attempting LinkedIn authentication');
      const response = await api.post('/auth/linkedin', { 
        code, 
        redirectUri 
      });
      
      if (!response.data || !response.data.token) {
        console.error('Invalid LinkedIn auth response:', response.data);
        throw new Error('Invalid response from server');
      }
      
      const { token, refreshToken, user } = response.data;
      
      // Store authentication data
      localStorage.setItem('@auth_token', token);
      localStorage.setItem('@refresh_token', refreshToken);
      localStorage.setItem('@user_data', JSON.stringify(user));
      
      // Set token for future API calls
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('LinkedIn authentication successful');
      return { user, source: 'linkedin' };
    } catch (error) {
      console.error('LinkedIn auth error:', error.response?.data || error.message);
      
      // Handle specific error cases
      if (!error.response) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.error || 'Invalid LinkedIn authorization');
      } else if (error.response?.status === 409) {
        throw new Error('An account with this email already exists with a different provider');
      } else if (error.response?.status === 500) {
        throw new Error('Server error during LinkedIn authentication. Please try again later.');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error('LinkedIn authentication failed. Please try again.');
      }
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = localStorage.getItem('@auth_token');
      const userData = localStorage.getItem('@user_data');
      
      return !!(token && userData);
    } catch (error) {
      console.error('Auth check error:', error.message);
      return false;
    }
  },
  
  // Logout user
  logout: async () => {
    try {
      // Try to notify the server about logout
      const token = localStorage.getItem('@auth_token');
      
      if (token) {
        try {
          await api.post('/auth/logout');
          console.log('Server logout successful');
        } catch (logoutError) {
          console.error('Server logout error:', logoutError.response?.data || logoutError.message);
          // Continue with local logout even if server logout fails
        }
      }
      
      // Always clear local storage
      localStorage.removeItem('@auth_token');
      localStorage.removeItem('@refresh_token');
      localStorage.removeItem('@user_data');
      
      // Clear auth header
      delete api.defaults.headers.common['Authorization'];
      
      console.log('Local logout successful');
      return true;
    } catch (error) {
      console.error('Logout error:', error.message);
      
      // Try to remove tokens anyway in case of error
      try {
        localStorage.removeItem('@auth_token');
        localStorage.removeItem('@refresh_token');
        localStorage.removeItem('@user_data');
        delete api.defaults.headers.common['Authorization'];
      } catch (storageError) {
        console.error('Failed to clear storage during logout:', storageError.message);
      }
      
      throw error;
    }
  },
  
  // Get current user data
  getCurrentUser: async () => {
    try {
      const userData = localStorage.getItem('@user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get user error:', error.message);
      return null;
    }
  },
  
  // Update the local user data
  updateLocalUserData: async (userData) => {
    try {
      if (!userData) {
        throw new Error('User data is required');
      }
      
      // Get existing data and merge with new data
      const existingData = localStorage.getItem('@user_data');
      const existingUserData = existingData ? JSON.parse(existingData) : {};
      const updatedUserData = { ...existingUserData, ...userData };
      
      localStorage.setItem('@user_data', JSON.stringify(updatedUserData));
      return updatedUserData;
    } catch (error) {
      console.error('Update user data error:', error.message);
      throw error;
    }
  },
  
  // Verify JWT token with server
  verifyToken: async (token) => {
    if (!token) {
      throw new Error('Token is required');
    }
    
    try {
      console.log('Verifying token with server');
      const response = await api.post('/auth/verify-token', { token });
      
      if (response.data && response.data.isValid && response.data.user) {
        // Update local user data if verification was successful
        localStorage.setItem('@user_data', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Verify token error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Refresh access token using refresh token
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('@refresh_token');
      
      if (!refreshToken) {
        console.log('No refresh token found, redirecting to login');
        // Return a clear object indicating auth is needed
        return { needsAuth: true, error: 'No refresh token available' };
      }
      
      console.log('Attempting to refresh token');
      const response = await api.post('/auth/refresh-token', { refreshToken });
      
      if (!response.data || !response.data.token) {
        throw new Error('Invalid refresh token response');
      }
      
      const { token: newToken, refreshToken: newRefreshToken } = response.data;
      
      // Update tokens in storage
      localStorage.setItem('@auth_token', newToken);
      if (newRefreshToken) {
        localStorage.setItem('@refresh_token', newRefreshToken);
      }
      
      // Update auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      console.log('Token refresh successful');
      return { token: newToken, refreshToken: newRefreshToken };
    } catch (error) {
      console.error('Refresh token error:', error.response?.data || error.message);
      
      // If refresh fails, clear tokens and force re-login
      if (error.response?.status === 401) {
        localStorage.removeItem('@auth_token');
        localStorage.removeItem('@refresh_token');
        delete api.defaults.headers.common['Authorization'];
      }
      
      throw error;
    }
  },
  
  // Initialize auth - call this at app startup
  initializeAuth: async () => {
    try {
      console.log('Initializing auth state');
      const token = localStorage.getItem('@auth_token');
      
      if (token) {
        // Set default auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Get user data directly from localStorage instead of verifying token
        const userData = localStorage.getItem('@user_data');
        
        if (userData) {
          return JSON.parse(userData);
        } else {
          console.log('No user data found, clearing auth data');
          await authService.logout();
          return null;
        }
      } else {
        console.log('No token found, user not authenticated');
        return null;
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      return null;
    }
  },
  
  // Send email verification code
  sendEmailVerificationCode: async (userId, email) => {
    if (!userId || !email) {
      throw new Error('User ID and email are required');
    }
    
    try {
      console.log(`Sending verification code to email: ${email} for user: ${userId}`);
      const response = await api.post('/auth/email/send-code', { userId, email });
      return response.data;
    } catch (error) {
      console.error('Send email verification code error:', error);
      throw error;
    }
  },

  // Verify email code
  verifyEmailCode: async (userId, code) => {
    if (!userId || !code) {
      throw new Error('User ID and verification code are required');
    }
    
    try {
      console.log(`Verifying email code: ${code} for user: ${userId}`);
      const response = await api.post('/auth/email/verify', { userId, code });
      return response.data;
    } catch (error) {
      console.error('Verify email code error:', error);
      throw error;
    }
  },

  // Send phone verification code
  sendPhoneVerificationCode: async (userId, phoneNumber) => {
    if (!userId || !phoneNumber) {
      throw new Error('User ID and phone number are required');
    }
    
    try {
      console.log(`Sending verification code to phone: ${phoneNumber} for user: ${userId}`);
      const response = await api.post('/auth/phone/send-code', { userId, phoneNumber });
      return response.data;
    } catch (error) {
      console.error('Send phone verification code error:', error);
      throw error;
    }
  },

  // Verify phone code
  verifyPhoneCode: async (userId, code) => {
    if (!userId || !code) {
      throw new Error('User ID and verification code are required');
    }
    
    try {
      console.log(`Verifying phone code: ${code} for user: ${userId}`);
      const response = await api.post('/auth/phone/verify', { userId, code });
      return response.data;
    } catch (error) {
      console.error('Verify phone code error:', error);
      throw error;
    }
  }
};

export default authService;