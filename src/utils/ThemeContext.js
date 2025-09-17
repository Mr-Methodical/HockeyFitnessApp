import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTeamTheme, TEAM_THEMES } from '../services/theme';
import { getPersonalTheme } from '../services/personalTheme';
import { useAuth } from './AuthContext';

const ThemeContext = createContext({});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { userProfile, user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(TEAM_THEMES.default);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeTheme();
  }, [userProfile?.teamId, userProfile?.role, user?.uid]);

  // Reset theme to default when user logs out
  useEffect(() => {
    if (!user) {
      console.log('🔄 User logged out, resetting theme to default');
      setCurrentTheme(TEAM_THEMES.default);
      setIsDarkMode(false); // Reset to light mode when logged out
      setLoading(false);
    }
  }, [user]);

  const initializeTheme = async () => {
    // Only initialize theme if user is logged in
    if (!user) {
      setCurrentTheme(TEAM_THEMES.default);
      setIsDarkMode(false);
      setLoading(false);
      return;
    }

    try {
      // Load dark mode preference (user-specific)
      if (user?.uid) {
        const userDarkModeKey = `darkMode_${user.uid}`;
        const savedDarkMode = await AsyncStorage.getItem(userDarkModeKey);
        if (savedDarkMode !== null) {
          setIsDarkMode(JSON.parse(savedDarkMode));
        } else {
          // If no saved preference, default to light mode
          setIsDarkMode(false);
        }
      }

      // Load team theme or personal theme
      if (userProfile?.role === 'group_member' && user?.uid) {
        // Group members use personal themes
        await loadPersonalTheme();
      } else if (userProfile?.teamId) {
        // Coaches and players use team themes
        await loadTeamTheme();
      } else {
        setCurrentTheme(TEAM_THEMES.default);
      }
    } catch (error) {
      console.error('Error initializing theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamTheme = async () => {
    if (!userProfile?.teamId) {
      setCurrentTheme(TEAM_THEMES.default);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const theme = await getTeamTheme(userProfile.teamId);
      
      // Ensure we have a valid theme object
      if (theme && typeof theme === 'object' && theme.primary) {
        setCurrentTheme(theme);
      } else {
        console.warn('Invalid theme received, using default');
        setCurrentTheme(TEAM_THEMES.default);
      }
    } catch (error) {
      console.error('Error loading team theme:', error);
      setCurrentTheme(TEAM_THEMES.default);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalTheme = async () => {
    if (!user?.uid) {
      setCurrentTheme(TEAM_THEMES.default);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const theme = await getPersonalTheme(user.uid);
      
      // Ensure we have a valid theme object
      if (theme && typeof theme === 'object' && theme.primary) {
        setCurrentTheme(theme);
        console.log('✅ Personal theme loaded:', theme.name);
      } else {
        console.warn('Invalid personal theme received, using default');
        setCurrentTheme(TEAM_THEMES.default);
      }
    } catch (error) {
      console.error('Error loading personal theme:', error);
      setCurrentTheme(TEAM_THEMES.default);
    } finally {
      setLoading(false);
    }
  };

  const refreshTheme = async () => {
    if (userProfile?.role === 'group_member' && user?.uid) {
      // Refresh personal theme for group members
      try {
        const personalTheme = await getPersonalTheme(user.uid);
        
        // Ensure we have a valid theme object
        if (personalTheme && typeof personalTheme === 'object' && personalTheme.primary) {
          setCurrentTheme(personalTheme);
          console.log('✅ Personal theme refreshed:', personalTheme.name);
          return; // Exit early if personal theme was found
        }
      } catch (error) {
        console.error('❌ Error refreshing personal theme:', error);
      }
    }
    
    // Fallback to team theme for coaches/players or if no personal theme
    if (userProfile?.teamId) {
      try {
        const theme = await getTeamTheme(userProfile.teamId);
        
        // Ensure we have a valid theme object
        if (theme && typeof theme === 'object' && theme.primary) {
          setCurrentTheme(theme);
          console.log('✅ Team theme refreshed:', theme.name);
        } else {
          console.warn('Invalid team theme received during refresh, keeping current');
        }
      } catch (error) {
        console.error('❌ Error refreshing team theme:', error);
        // Don't change theme on error - keep current one
      }
    } else {
      setCurrentTheme(TEAM_THEMES.default);
    }
  };

  const toggleDarkMode = async () => {
    try {
      if (!user?.uid) {
        console.error('❌ Cannot toggle dark mode: no user ID available');
        return;
      }
      
      const newDarkMode = !isDarkMode;
      setIsDarkMode(newDarkMode);
      
      // Save with user-specific key
      const userDarkModeKey = `darkMode_${user.uid}`;
      await AsyncStorage.setItem(userDarkModeKey, JSON.stringify(newDarkMode));
      console.log('✅ Dark mode toggled for user', user.uid, ':', newDarkMode);
    } catch (error) {
      console.error('❌ Error saving dark mode preference:', error);
    }
  };

  // Create the final theme object with dark mode modifications
  const getThemedColors = () => {
    if (!isDarkMode) {
      return currentTheme;
    }

    // Comprehensive dark mode modifications
    return {
      ...currentTheme,
      // Main backgrounds
      background: '#121212',
      surface: '#1E1E1E',
      secondary: '#2C2C2C',
      card: '#2C2C2C',
      // Text colors
      primary: currentTheme.primary, // Keep team color for primary elements
      text: '#FFFFFF',
      textSecondary: '#B0B0B0',
      textMuted: '#808080',
      // Borders and dividers
      border: '#3C3C3C',
      divider: '#3C3C3C',
      // Status colors (keep original but slightly muted)
      accent: currentTheme.accent,
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      // Interactive elements
      buttonBackground: '#3C3C3C',
      buttonText: '#FFFFFF',
      // Input fields
      inputBackground: '#2C2C2C',
      inputBorder: '#3C3C3C',
      inputText: '#FFFFFF',
      inputPlaceholder: '#808080',
      // Modal and overlay
      modalBackground: '#1E1E1E',
      overlayBackground: 'rgba(0, 0, 0, 0.8)',
      // Tab navigation
      tabBarBackground: '#1E1E1E',
      tabBarActive: currentTheme.primary,
      tabBarInactive: '#808080'
    };
  };

  const value = {
    currentTheme: getThemedColors(),
    isDarkMode,
    loading,
    refreshTheme,
    toggleDarkMode,
    availableThemes: TEAM_THEMES
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
