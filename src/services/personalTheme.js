import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// General themes for group members (non-sports specific)
export const PERSONAL_THEMES = {
  default: {
    name: 'Ocean Blue',
    primary: '#007AFF',
    secondary: '#FFFFFF',
    accent: '#34C759',
    gradient: ['#007AFF', '#5856D6']
  },
  forest: {
    name: 'Forest Green',
    primary: '#34C759',
    secondary: '#FFFFFF',
    accent: '#007AFF',
    gradient: ['#34C759', '#30D158']
  },
  sunset: {
    name: 'Sunset Orange',
    primary: '#FF9500',
    secondary: '#FFFFFF',
    accent: '#FF6B35',
    gradient: ['#FF9500', '#FF6B35']
  },
  lavender: {
    name: 'Lavender Purple',
    primary: '#5856D6',
    secondary: '#FFFFFF',
    accent: '#AF52DE',
    gradient: ['#5856D6', '#AF52DE']
  },
  cherry: {
    name: 'Cherry Red',
    primary: '#FF3B30',
    secondary: '#FFFFFF',
    accent: '#FF6B6B',
    gradient: ['#FF3B30', '#FF6B6B']
  },
  midnight: {
    name: 'Midnight Blue',
    primary: '#1D3557',
    secondary: '#F1FAEE',
    accent: '#457B9D',
    gradient: ['#1D3557', '#457B9D']
  },
  emerald: {
    name: 'Emerald',
    primary: '#2D6A4F',
    secondary: '#FFFFFF',
    accent: '#52B788',
    gradient: ['#2D6A4F', '#52B788']
  },
  coral: {
    name: 'Coral Pink',
    primary: '#F72585',
    secondary: '#FFFFFF',
    accent: '#B5179E',
    gradient: ['#F72585', '#B5179E']
  },
  golden: {
    name: 'Golden Hour',
    primary: '#F77F00',
    secondary: '#FCBF49',
    accent: '#FFFFFF',
    gradient: ['#F77F00', '#FCBF49']
  },
  mint: {
    name: 'Fresh Mint',
    primary: '#06FFA5',
    secondary: '#FFFFFF',
    accent: '#2ECC71',
    gradient: ['#06FFA5', '#2ECC71']
  },
  royal: {
    name: 'Royal Purple',
    primary: '#6A0572',
    secondary: '#FFFFFF',
    accent: '#AB83A1',
    gradient: ['#6A0572', '#AB83A1']
  },
  slate: {
    name: 'Modern Slate',
    primary: '#2F3E46',
    secondary: '#FFFFFF',
    accent: '#84A98C',
    gradient: ['#2F3E46', '#84A98C']
  },
  turquoise: {
    name: 'Turquoise',
    primary: '#06D6A0',
    secondary: '#FFFFFF',
    accent: '#118AB2',
    gradient: ['#06D6A0', '#118AB2']
  },
  rose: {
    name: 'Rose Gold',
    primary: '#E09F3E',
    secondary: '#FFFFFF',
    accent: '#D62D20',
    gradient: ['#E09F3E', '#D62D20']
  },
  custom: {
    name: 'Custom',
    primary: '#007AFF',
    secondary: '#FFFFFF',
    accent: '#FF9500',
    gradient: ['#007AFF', '#FFFFFF']
  }
};

// Save personal theme for group members
export const updatePersonalTheme = async (userId, themeKey) => {
  try {
    console.log('🎨 Updating personal theme for user:', userId, 'to:', themeKey);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      personalTheme: themeKey,
      updatedAt: new Date()
    });
    
    console.log('✅ Personal theme updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating personal theme:', error);
    throw error;
  }
};

// Get personal theme for a user
export const getPersonalTheme = async (userId) => {
  try {
    console.log('🎨 Getting personal theme for user:', userId);
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const themeKey = userData.personalTheme || 'default';
      console.log('🎨 User data personalTheme:', themeKey);
      
      // If it's a custom theme, return the custom colors
      if (themeKey === 'custom' && userData.customPersonalTheme) {
        console.log('🎨 Returning custom personal theme:', userData.customPersonalTheme);
        const customTheme = {
          ...PERSONAL_THEMES.custom,
          ...userData.customPersonalTheme
        };
        // Ensure it has all required properties
        return {
          name: 'Custom',
          primary: customTheme.primary || '#007AFF',
          secondary: customTheme.secondary || '#FFFFFF', 
          accent: customTheme.accent || '#FF9500',
          gradient: customTheme.gradient || [customTheme.primary || '#007AFF', customTheme.secondary || '#FFFFFF']
        };
      }
      
      // Return predefined theme or default
      const selectedTheme = PERSONAL_THEMES[themeKey] || PERSONAL_THEMES.default;
      console.log('🎨 Returning predefined theme:', selectedTheme.name);
      return {
        ...selectedTheme,
        // Ensure all required properties exist
        name: selectedTheme.name || 'Ocean Blue',
        primary: selectedTheme.primary || '#007AFF',
        secondary: selectedTheme.secondary || '#FFFFFF',
        accent: selectedTheme.accent || '#34C759',
        gradient: selectedTheme.gradient || ['#007AFF', '#5856D6']
      };
    }
    
    console.log('🎨 No user document found, returning default theme');
    return PERSONAL_THEMES.default;
  } catch (error) {
    console.error('❌ Error getting personal theme:', error);
    return PERSONAL_THEMES.default;
  }
};

// Save custom personal theme colors
export const updateCustomPersonalTheme = async (userId, customColors) => {
  try {
    console.log('🎨 Updating custom personal theme for user:', userId);
    console.log('🎨 Custom colors:', customColors);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      personalTheme: 'custom',
      customPersonalTheme: customColors,
      updatedAt: new Date()
    });
    
    console.log('✅ Custom personal theme updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating custom personal theme:', error);
    console.error('❌ Error details:', error.message);
    throw error;
  }
};
