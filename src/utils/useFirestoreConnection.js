import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import { forceEnableNetwork, checkFirestoreConnection } from '../services/firestoreUtils';

// Hook to monitor and manage Firestore connectivity
export const useFirestoreConnection = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionChecking, setConnectionChecking] = useState(false);

  // Check connection status with reduced logging
  const checkConnection = async () => {
    if (connectionChecking) return; // Prevent multiple simultaneous checks
    
    setConnectionChecking(true);
    try {
      const connected = await checkFirestoreConnection();
      setIsConnected(connected);
      return connected;
    } catch (error) {
      setIsConnected(false);
      return false;
    } finally {
      setConnectionChecking(false);
    }
  };

  // Force reconnection - simplified to avoid internal assertion errors
  const forceReconnect = async () => {
    if (connectionChecking) return;
    
    setConnectionChecking(true);
    try {
      // Just check connection without forcing network operations
      // The SDK will handle reconnection automatically
      const connected = await checkFirestoreConnection();
      setIsConnected(connected);
      return connected;
    } catch (error) {
      console.warn('Connection check failed:', error);
      setIsConnected(false);
      return false;
    } finally {
      setConnectionChecking(false);
    }
  };

  useEffect(() => {
    // Initial connection check with delay
    const timer = setTimeout(() => {
      checkConnection();
    }, 2000);

    // Handle app state changes (when app comes back from background)
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, check/force reconnection after delay
        setTimeout(() => {
          forceReconnect();
        }, 3000); // Longer delay to allow network to stabilize
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Reduced frequency connection check every 60 seconds when app is active
    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active' && !connectionChecking) {
        checkConnection();
      }
    }, 60000); // Increased from 30 to 60 seconds

    return () => {
      clearTimeout(timer);
      subscription?.remove();
      clearInterval(intervalId);
    };
  }, []);

  return {
    isConnected,
    connectionChecking,
    checkConnection,
    forceReconnect
  };
};
