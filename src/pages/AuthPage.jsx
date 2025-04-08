import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import Login from '../components/auth/Login';
import Signup from '../components/auth/Signup';
import PhoneLogin from '../components/auth/PhoneLogin';
import { useAuth } from '../context/AuthContext';

const AuthPage = ({ type: propType }) => {
  const { type: paramType } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading, handleAuthCallback, isNewSignup } = useAuth();
  
  // Initialize authType from either prop or param
  const [authType, setAuthType] = useState(propType || paramType || 'login');
  const [isCallbackProcessed, setIsCallbackProcessed] = useState(false);

  useEffect(() => {
    // Handle OAuth callback
    if (location.pathname === '/auth/callback' && !isCallbackProcessed) {
      console.log('OAuth callback triggered, params:', searchParams.toString());
      
      // Mark callback as processed to prevent multiple redirect attempts
      setIsCallbackProcessed(true);
      
      // Process the callback - handleAuthCallback will handle the redirects
      handleAuthCallback(searchParams);
      return;
    }
    
    // Only run the following logic when auth state is settled (not loading)
    if (!loading) {
      // For debugging
      console.log('Auth state:', { user, isNewSignup, pathname: location.pathname });
      
      // If authenticated user...
      if (user) {
        // New users should be redirected to profile setup from any auth page
        if (isNewSignup && 
            (location.pathname === '/login' || 
             location.pathname === '/signup' || 
             location.pathname === '/phone-login')) {
          console.log('Redirecting new user to profile setup');
          navigate('/profile-setup');
          return;
        }
        
        // Existing users should be redirected to dashboard from any auth page
        if (!isNewSignup && 
            (location.pathname === '/login' || 
             location.pathname === '/signup' || 
             location.pathname === '/phone-login')) {
          console.log('Redirecting existing user to dashboard');
          navigate('/dashboard');
          return;
        }
      }
    }
    
    // Update auth type if props or params change
    if (propType || paramType) {
      setAuthType(propType || paramType);
    }
  }, [user, loading, propType, paramType, location.pathname, navigate, searchParams, 
     handleAuthCallback, isNewSignup, isCallbackProcessed]);
  
  // Render appropriate auth component
  const renderAuthComponent = () => {
    switch (authType) {
      case 'signup':
        return <Signup />;
      case 'phone-login':
        return <PhoneLogin />;
      case 'login':
      default:
        return <Login />;
    }
  };

  // Show loading indicator while authentication state is being determined
  if (loading || (location.pathname === '/auth/callback' && !isCallbackProcessed)) {
    return (
      <AuthLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {renderAuthComponent()}
    </AuthLayout>
  );
};

export default AuthPage;