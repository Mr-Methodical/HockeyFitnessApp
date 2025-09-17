import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Hockey-themed color palettes for group members
export const PERSONAL_THEMES = {
  default: {
    name: 'Hockey Ice Blue',
    primary: '#0066CC',
    secondary: '#FFFFFF',
    accent: '#FF6B35',
    gradient: ['#0066CC', '#004D99'],
    hockeyTheme: true
  },
  hockey_classic: {
    name: 'Classic Hockey Red',
    primary: '#CC0000',
    secondary: '#FFFFFF',
    accent: '#000000',
    gradient: ['#CC0000', '#990000'],
    hockeyTheme: true
  },
  hockey_kings: {
    name: 'Kings Black & Silver',
    primary: '#000000',
    secondary: '#C4CED4',
    accent: '#A2AAAD',
    gradient: ['#000000', '#393939'],
    hockeyTheme: true
  },
  hockey_bruins: {
    name: 'Bruins Gold & Black',
    primary: '#FFB81C',
    secondary: '#000000',
    accent: '#FFFFFF',
    gradient: ['#FFB81C', '#CC9316'],
    hockeyTheme: true
  },
  hockey_rangers: {
    name: 'Rangers Royal Blue',
    primary: '#0038A8',
    secondary: '#FFFFFF',
    accent: '#CE1126',
    gradient: ['#0038A8', '#002D84'],
    hockeyTheme: true
  },
  hockey_leafs: {
    name: 'Maple Leafs Blue',
    primary: '#003E7E',
    secondary: '#FFFFFF',
    accent: '#C8102E',
    gradient: ['#003E7E', '#002F63'],
    hockeyTheme: true
  },
  hockey_stars: {
    name: 'Stars Victory Green',
    primary: '#006847',
    secondary: '#FFFFFF',
    accent: '#8F8F8C',
    gradient: ['#006847', '#004F35'],
    hockeyTheme: true
  },
  hockey_flames: {
    name: 'Flames Red & Yellow',
    primary: '#C8102E',
    secondary: '#F1C232',
    accent: '#000000',
    gradient: ['#C8102E', '#9A0D23'],
    hockeyTheme: true
  },
  hockey_penguins: {
    name: 'Penguins Gold & Black',
    primary: '#FCB514',
    secondary: '#000000',
    accent: '#FFFFFF',
    gradient: ['#FCB514', '#D49610'],
    hockeyTheme: true
  },
  hockey_blackhawks: {
    name: 'Blackhawks Red & Black',
    primary: '#CE1126',
    secondary: '#000000',
    accent: '#FFB81C',
    gradient: ['#CE1126', '#A30E1E'],
    hockeyTheme: true
  },
  hockey_lightning: {
    name: 'Lightning Blue & White',
    primary: '#002868',
    secondary: '#FFFFFF',
    accent: '#00B9F2',
    gradient: ['#002868', '#001F4F'],
    hockeyTheme: true
  },
  hockey_avalanche: {
    name: 'Avalanche Burgundy',
    primary: '#6F263D',
    secondary: '#236192',
    accent: '#A2AAAD',
    gradient: ['#6F263D', '#5A1E30'],
    hockeyTheme: true
  },
  hockey_panthers: {
    name: 'Panthers Navy & Gold',
    primary: '#041E42',
    secondary: '#C8102E',
    accent: '#B9975B',
    gradient: ['#041E42', '#031632'],
    hockeyTheme: true
  },
  hockey_capitals: {
    name: 'Capitals Red & Blue',
    primary: '#C8102E',
    secondary: '#041E42',
    accent: '#FFFFFF',
    gradient: ['#C8102E', '#9A0D23'],
    hockeyTheme: true
  },
  hockey_oilers: {
    name: 'Oilers Orange & Blue',
    primary: '#FF4C00',
    secondary: '#041E42',
    accent: '#FFFFFF',
    gradient: ['#FF4C00', '#CC3C00'],
    hockeyTheme: true
  },
  hockey_devils: {
    name: 'Devils Red & Black',
    primary: '#CE1126',
    secondary: '#000000',
    accent: '#FFFFFF',
    gradient: ['#CE1126', '#A30E1E'],
    hockeyTheme: true
  },
  hockey_sharks: {
    name: 'Sharks Teal & Black',
    primary: '#006D75',
    secondary: '#000000',
    accent: '#EA7200',
    gradient: ['#006D75', '#00545A'],
    hockeyTheme: true
  },
  hockey_wild: {
    name: 'Wild Forest Green',
    primary: '#154734',
    secondary: '#A6192E',
    accent: '#EAAA00',
    gradient: ['#154734', '#0F3528'],
    hockeyTheme: true
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
