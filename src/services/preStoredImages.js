// Service for handling pre-stored workout images
// Cycles through the 8 available pre-stored workout images
import { Image } from 'react-native';

// Available pre-stored images in assets/workout-images/
const PRE_STORED_IMAGES = [
  require('../../assets/workout-images/player_hockey_conditioning_1.png'),
  require('../../assets/workout-images/player_hockey_conditioning_2.png'),
  require('../../assets/workout-images/player_strength_training_1.png'),
  require('../../assets/workout-images/player_speed_agility_1.png'),
  require('../../assets/workout-images/groupmember_hockey_fitness_1.png'),
  require('../../assets/workout-images/groupmember_hockey_fitness_2.png'),
  require('../../assets/workout-images/groupmember_hockey_strength_1.png'),
  require('../../assets/workout-images/groupmember_hockey_mobility_1.png'),
];

/**
 * Get image for a workout based on its preferences
 * Cycles through pre-stored images instead of generating via AI
 */
export const getWorkoutImage = async (workoutId, workoutTitle, workoutDescription, userId, userRole) => {
  try {
    console.log(`🖼️ Getting pre-stored image for workout: ${workoutTitle}`);
    
    // Use pre-stored image based on workout characteristics
    const imagePath = getPreStoredImagePath(workoutTitle, workoutDescription, userRole);
    console.log(`✅ Using pre-stored image: ${imagePath}`);
    return imagePath;
    
  } catch (error) {
    console.error('❌ Error getting workout image:', error);
    // Return a fallback image URI
    const fallbackAsset = Image.resolveAssetSource(PRE_STORED_IMAGES[0]);
    return fallbackAsset ? fallbackAsset.uri : null;
  }
};

/**
 * Get pre-stored image path based on workout characteristics
 */
const getPreStoredImagePath = (workoutTitle, workoutDescription, userRole) => {
  // Create a simple hash from workout title to ensure consistent image selection
  const hash = simpleHash(workoutTitle || 'default');
  const imageIndex = hash % PRE_STORED_IMAGES.length;
  
  console.log(`🎯 Selected image index ${imageIndex} for workout: ${workoutTitle}`);
  
  // Convert React Native asset number to proper URI using Image.resolveAssetSource
  const assetSource = Image.resolveAssetSource(PRE_STORED_IMAGES[imageIndex]);
  const imageUri = assetSource ? assetSource.uri : null;
  
  console.log(`📸 Resolved asset to URI: ${imageUri}`);
  return imageUri;
};

/**
 * Simple hash function to create consistent image selection
 */
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Fast image generation - uses pre-stored images instead of API
 */
export const generateWorkoutImageFast = async (title, description, userId, speed = 'fast', userRole) => {
  console.log('⚡ Fast image generation requested - using pre-stored images');
  
  if (speed === 'instant') {
    // For instant mode, skip image generation
    return null;
  }
  
  // For fast mode, use pre-stored images instead of backend API
  return await getWorkoutImage(null, title, description, userId, userRole);
};

/**
 * Background image generation - uses pre-stored images
 */
export const generateImageInBackground = async (title, description, userId, speed, userRole) => {
  console.log('🖼️ Background image generation - using pre-stored images');
  return await getWorkoutImage(null, title, description, userId, userRole);
};