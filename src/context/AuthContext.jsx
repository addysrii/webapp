import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import api from '../services/api'; // Add this import!

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('@auth_token'));
  const [loading, setLoading] = useState(true);
  const [isNewSignup, setIsNewSignup] = useState(false);
  const navigate = useNavigate();

  // Load user info when token changes
  useEffect(() => {
    const loadUserInfo = async () => {
      if (token) {
        try {
          // Set authorization header for API requests
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Try to get user data from localStorage first
          const userData = localStorage.getItem('@user_data');
          if (userData) {
            const parsedUserData = JSON.parse(userData);
            setUser(parsedUserData);
            setIsNewSignup(false);
            setLoading(false);
            
            // Skip the immediate verification which is causing issues
            // Instead, we'll just check if we have valid user data
            console.log('User data loaded from localStorage');
          } else {
            // No user data in localStorage
            console.log('No user data in localStorage, logging out');
            logout();
          }
        } catch (error) {
          console.error('Failed to load user info:', error);
          // Only logout for authentication errors
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            logout();
          }
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, [token]);
  
  // Rest of your component code...
  const login = async (email, password) => {
    try {
      // Call authService.login with separate email and password parameters
      const response = await authService.login(email, password);
      
      // Get token from localStorage (set by authService)
      const currentToken = localStorage.getItem('@auth_token');
      setToken(currentToken);
      setUser(response.user);
      setIsNewSignup(false);
      return { token: currentToken, user: response.user };
    } catch (error) {
      throw error;
    }
  };
  const signup = async (userData) => {
    try {
      // Use authService.signup which returns { user, source }
      const response = await authService.signup(userData);
      // Get token from localStorage (set by authService)
      const currentToken = localStorage.getItem('@auth_token');
      setToken(currentToken);
      setUser(response.user);
      
      // Determine if this is a new user based on the response
      const isNewUser = response.source === 'signup';
      setIsNewSignup(isNewUser);
      
      return isNewUser;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    // Use authService.logout which handles both server and local logout
    authService.logout().then(() => {
      setToken(null);
      setUser(null);
      setIsNewSignup(false);
      navigate('/login');
    }).catch(error => {
      console.error('Logout error:', error);
      // Still clear state even if server logout fails
      setToken(null);
      setUser(null);
      setIsNewSignup(false);
      navigate('/login');
    });
  };

  const updateUser = async (userData) => {
    try {
      // Update local user data through authService
      const updatedUser = await authService.updateLocalUserData(userData);
      setUser(updatedUser);
      
      // When user updates profile, reset new signup flag
      if (isNewSignup) {
        setIsNewSignup(false);
      }
      
      return updatedUser;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const handleAuthCallback = async (searchParams) => {
    console.log('Auth callback triggered', searchParams.toString());
    const token = searchParams.get('token');
    console.log('Token from URL:', token);
    
    if (token) {
      // Store the token in localStorage with proper key
      localStorage.setItem('@auth_token', token);
      
      // Update the token state
      setToken(token);
      
      // Check if this is a new user based on the flag from the backend
      const isNewUser = searchParams.get('isNewUser') === 'true';
      console.log('Is new user from URL params:', isNewUser);
      
      // Set the new signup flag before any redirects
      setIsNewSignup(isNewUser);
      
      // Verify the token and get user data
      try {
        const verifyResult = await authService.verifyToken(token);
        if (verifyResult.isValid && verifyResult.user) {
          setUser(verifyResult.user);
        }
      } catch (error) {
        console.error('Token verification error:', error);
      }
      
      // Important: Force a slight delay to ensure state update before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (isNewUser) {
        // Always redirect new users to profile setup
        console.log('New user detected, redirecting to profile setup');
        navigate('/profile-setup');
      } else {
        // Get the redirect destination for existing users
        const redirect = searchParams.get('redirect') || '/dashboard';
        console.log('Existing user, redirecting to:', redirect);
        navigate(redirect);
      }
    } else {
      console.error('No token found in URL parameters');
      navigate('/login?error=auth_failed');
    }
  };

  const sendPhoneVerification = async (phoneNumber) => {
    if (!user || !user.id) {
      throw new Error('User must be logged in to verify phone');
    }
    return authService.sendPhoneVerificationCode(user.id, phoneNumber);
  };

  const verifyPhone = async (phoneNumber, code) => {
    try {
      if (!user || !user.id) {
        throw new Error('User must be logged in to verify phone');
      }
      
      const response = await authService.verifyPhoneCode(user.id, code);
      
      // If verification successful, update user data
      if (response.success) {
        const updatedUserData = {
          ...user,
          phoneNumber,
          phoneVerified: true
        };
        
        await updateUser(updatedUserData);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const socialLogin = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/${provider}?redirectTo=${window.location.origin}/auth/callback`;
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    updateUser,
    sendPhoneVerification,
    verifyPhone,
    socialLogin,
    handleAuthCallback,
    isNewSignup,
    setIsNewSignup
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;