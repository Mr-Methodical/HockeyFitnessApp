import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange, getUserProfile } from '../services/auth';
import { useFirestoreConnection } from './useFirestoreConnection';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const { isConnected, forceReconnect } = useFirestoreConnection();

  const fetchUserProfile = async (firebaseUser) => {
    if (!firebaseUser) return;
    
    setProfileLoading(true);
    try {
      const profile = await getUserProfile(firebaseUser.uid);
      setUserProfile(profile);
      console.log('✅ User profile loaded for:', profile.name);
      console.log('🔍 User role:', profile.role);
      console.log('🔍 User teamId:', profile.teamId);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      
      // If we're offline, try to reconnect and retry once
      if (!isConnected) {
        console.log('Attempting to reconnect and retry profile fetch...');
        const reconnected = await forceReconnect();
        if (reconnected) {
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            setUserProfile(profile);
            console.log('✅ User profile loaded on retry for:', profile.name);
          } catch (retryError) {
            console.error('Profile fetch retry failed:', retryError);
          }
        }
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Retry profile fetch when connection is restored
  useEffect(() => {
    if (isConnected && user && !userProfile && !profileLoading) {
      console.log('Connection restored, retrying profile fetch...');
      fetchUserProfile(user);
    }
  }, [isConnected, user, userProfile, profileLoading]);

  const value = {
    user,
    userProfile,
    loading: loading || profileLoading,
    isAuthenticated: !!user,
    isCoach: userProfile?.role === 'coach',
    isPlayer: userProfile?.role === 'player',
    isGroupMember: userProfile?.role === 'group_member',
    isConnected,
    forceReconnect,
    refetchProfile: () => user && fetchUserProfile(user)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
