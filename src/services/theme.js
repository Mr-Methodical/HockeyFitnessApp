import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Predefined team color schemes
export const TEAM_THEMES = {
  default: {
    name: 'Default',
    primary: '#007AFF',
    secondary: '#1C1C1E',
    accent: '#FFFFFF',
    gradient: ['#007AFF', '#1C1C1E']
  },
  custom: {
    name: 'Custom',
    primary: '#007AFF',
    secondary: '#FFFFFF',
    accent: '#FF9500',
    gradient: ['#007AFF', '#FFFFFF']
  },
  penguins: {
    name: 'Pittsburgh Penguins',
    primary: '#000000',
    secondary: '#FCB514',
    accent: '#FFFFFF',
    gradient: ['#000000', '#FCB514']
  },
  bruins: {
    name: 'Boston Bruins',
    primary: '#FFB81C',
    secondary: '#000000',
    accent: '#FFFFFF',
    gradient: ['#FFB81C', '#000000']
  },
  rangers: {
    name: 'New York Rangers',
    primary: '#0038A8',
    secondary: '#CE1126',
    accent: '#FFFFFF',
    gradient: ['#0038A8', '#CE1126']
  },
  blackhawks: {
    name: 'Chicago Blackhawks',
    primary: '#CF0A2C',
    secondary: '#000000',
    accent: '#FFB81C',
    gradient: ['#CF0A2C', '#000000']
  },
  oilers: {
    name: 'Edmonton Oilers',
    primary: '#FF4C00',
    secondary: '#003777',
    accent: '#FFFFFF',
    gradient: ['#FF4C00', '#003777']
  },
  kings: {
    name: 'Los Angeles Kings',
    primary: '#111111',
    secondary: '#A2AAAD',
    accent: '#FFFFFF',
    gradient: ['#111111', '#A2AAAD']
  },
  capitals: {
    name: 'Washington Capitals',
    primary: '#C8102E',
    secondary: '#041E42',
    accent: '#FFFFFF',
    gradient: ['#C8102E', '#041E42']
  },
  avalanche: {
    name: 'Colorado Avalanche',
    primary: '#6F263D',
    secondary: '#236192',
    accent: '#A2AAAD',
    gradient: ['#6F263D', '#236192']
  },
  blues: {
    name: 'St. Louis Blues',
    primary: '#002F87',
    secondary: '#FCB514',
    accent: '#041E42',
    gradient: ['#002F87', '#FCB514']
  },
  predators: {
    name: 'Nashville Predators',
    primary: '#FFB81C',
    secondary: '#041E42',
    accent: '#FFFFFF',
    gradient: ['#FFB81C', '#041E42']
  },
  panthers: {
    name: 'Florida Panthers',
    primary: '#041E42',
    secondary: '#C8102E',
    accent: '#B9975B',
    gradient: ['#041E42', '#C8102E']
  }
};

// Save team theme to Firestore
export const updateTeamTheme = async (teamId, themeKey) => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      theme: themeKey,
      updatedAt: new Date()
    });
    
    console.log('✅ Team theme updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating team theme:', error);
    throw error;
  }
};

// Get team theme from Firestore
export const getTeamTheme = async (teamId) => {
  try {
    const teamRef = doc(db, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);
    
    if (teamDoc.exists()) {
      const teamData = teamDoc.data();
      const themeKey = teamData.theme || 'default';
      
      // If it's a custom theme, return the custom colors
      if (themeKey === 'custom' && teamData.customTheme) {
        const customTheme = {
          ...TEAM_THEMES.custom,
          ...teamData.customTheme
        };
        // Ensure it has all required properties
        return {
          name: 'Custom',
          primary: customTheme.primary || '#1E40AF',
          secondary: customTheme.secondary || '#FFFFFF', 
          accent: customTheme.accent || '#DC2626',
          gradient: customTheme.gradient || [customTheme.primary || '#1E40AF', customTheme.secondary || '#FFFFFF']
        };
      }
      
      // Return predefined theme or default
      const selectedTheme = TEAM_THEMES[themeKey] || TEAM_THEMES.default;
      return {
        ...selectedTheme,
        // Ensure all required properties exist
        name: selectedTheme.name || 'Default',
        primary: selectedTheme.primary || '#007AFF',
        secondary: selectedTheme.secondary || '#1C1C1E',
        accent: selectedTheme.accent || '#FFFFFF',
        gradient: selectedTheme.gradient || ['#007AFF', '#1C1C1E']
      };
    }
    
    return TEAM_THEMES.default;
  } catch (error) {
    console.error('❌ Error getting team theme:', error);
    return TEAM_THEMES.default;
  }
};

// Save custom team theme colors to Firestore
export const updateCustomTeamTheme = async (teamId, customColors) => {
  try {
    console.log('🎨 Updating custom theme for team:', teamId);
    console.log('🎨 Custom colors:', customColors);
    
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, {
      theme: 'custom',
      customTheme: customColors,
      updatedAt: new Date()
    });
    
    console.log('✅ Custom team theme updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating custom team theme:', error);
    console.error('❌ Error details:', error.message);
    throw error;
  }
};

// Get theme colors for a specific theme key
export const getThemeColors = (themeKey) => {
  return TEAM_THEMES[themeKey] || TEAM_THEMES.default;
};
