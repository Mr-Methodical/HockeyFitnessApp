import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { storage, auth } from './firebase';
import { uploadImageWithExpoFix } from './expoImageUpload';
import workoutImages from '../data/workoutImages.json';

/**
 * Workout Image Service
 * Handles both public pre-generated images and user-specific workout images
 * with secure Firebase Storage paths and fallback mechanisms
 */

/**
 * Get a random public pre-generated workout image
 * @returns {string} Public Firebase Storage URL or fallback
 */
export const getRandomPublicWorkoutImage = () => {
  const { publicImages, fallbackImages } = workoutImages;
  
  // Try to use Firebase Storage URLs first
  if (publicImages && publicImages.length > 0) {
    const randomIndex = Math.floor(Math.random() * publicImages.length);
    return publicImages[randomIndex];
  }
  
  // Fallback to local asset names if Firebase URLs aren't available
  if (fallbackImages && fallbackImages.length > 0) {
    const randomIndex = Math.floor(Math.random() * fallbackImages.length);
    return fallbackImages[randomIndex];
  }
  
  // Ultimate fallback
  return 'https://placeholder-image-url.com/workout.jpg';
};

/**
 * Upload a user workout image to their personal folder
 * Path: workouts/<uid>/<timestamp>_workout.jpg
 * @param {string} imageUri - Local image URI from camera/gallery
 * @param {string} userId - User ID (optional, will use current auth user if not provided)
 * @returns {Promise<string|null>} Firebase Storage download URL or null if failed
 */
export const uploadUserWorkoutImage = async (imageUri, userId = null) => {
  try {
    // Use the improved Expo-compatible upload method
    return await uploadImageWithExpoFix(imageUri, userId);
  } catch (error) {
    console.error('❌ User workout image upload failed:', error);
    console.error('❌ Error details:', error.message);
    return null;
  }
};

/**
 * Get user's uploaded workout images
 * @param {string} userId - User ID (optional, will use current auth user if not provided)
 * @returns {Promise<Array>} Array of image objects with url and metadata
 */
export const getUserWorkoutImages = async (userId = null) => {
  try {
    const currentUser = auth.currentUser;
    const targetUserId = userId || currentUser?.uid;
    
    if (!targetUserId) {
      console.log('❌ No authenticated user found for getting workout images');
      return [];
    }

    console.log('📥 Getting user workout images...');
    console.log('👤 User ID:', targetUserId);
    
    // Create reference to user's folder (matches Firebase Storage rules)
    const userFolderRef = ref(storage, `workouts/${targetUserId}`);
    
    // List all files in user's folder
    const listResult = await listAll(userFolderRef);
    
    // Get download URLs and metadata for all images
    const imagePromises = listResult.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef);
      return {
        name: itemRef.name,
        url: url,
        fullPath: itemRef.fullPath
      };
    });
    
    const images = await Promise.all(imagePromises);
    console.log(`✅ Found ${images.length} user workout images`);
    return images;
  } catch (error) {
    console.error('❌ Failed to get user workout images:', error);
    return [];
  }
};

/**
 * Get workout image for display - uses user's images if available, otherwise public images
 * @param {string} userId - User ID (optional, will use current auth user if not provided)
 * @returns {Promise<string>} Image URL (user's image or random public image)
 */
export const getWorkoutImageForUser = async (userId = null) => {
  try {
    const currentUser = auth.currentUser;
    const targetUserId = userId || currentUser?.uid;
    
    if (!targetUserId) {
      // No user logged in, use public image
      console.log('📸 No user authenticated, using public workout image');
      return getRandomPublicWorkoutImage();
    }

    // Try to get user's images first
    const userImages = await getUserWorkoutImages(targetUserId);
    
    if (userImages.length > 0) {
      // User has uploaded images, use a random one
      const randomIndex = Math.floor(Math.random() * userImages.length);
      console.log('📸 Using user\'s uploaded workout image');
      return userImages[randomIndex].url;
    } else {
      // User has no uploaded images, use public image
      console.log('📸 User has no uploaded images, using public workout image');
      return getRandomPublicWorkoutImage();
    }
  } catch (error) {
    console.error('❌ Error getting workout image for user:', error);
    // Fallback to public image
    return getRandomPublicWorkoutImage();
  }
};

/**
 * Get workout image with fallback logic
 * @param {string} customImageUrl - Specific image URL to use
 * @param {string} userId - User ID
 * @returns {Promise<string>} Image URL
 */
export const getWorkoutImageWithFallback = async (customImageUrl, userId) => {
  try {
    // If custom image URL is provided, try to use it
    if (customImageUrl) {
      return customImageUrl;
    }

    // Try to get user's uploaded images first
    if (userId && auth.currentUser && auth.currentUser.uid === userId) {
      const userImages = await getUserWorkoutImages(userId);
      if (userImages.length > 0) {
        // Return a random user image
        const randomIndex = Math.floor(Math.random() * userImages.length);
        return userImages[randomIndex].url;
      }
    }

    // Fallback to public pre-generated images
    return getRandomPublicWorkoutImage();
  } catch (error) {
    console.error('❌ Get workout image with fallback error:', error);
    // Ultimate fallback to public images
    return getRandomPublicWorkoutImage();
  }
};

/**
 * Add image to workout object - enhanced version with new image service
 * @param {Object} workout - Workout object
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Object>} Workout object with image property
 */
export const addImageToWorkout = async (workout, userId = null) => {
  try {
    const imageUrl = await getWorkoutImageForUser(userId);
    return {
      ...workout,
      image: imageUrl
    };
  } catch (error) {
    console.error('❌ Error adding image to workout:', error);
    return {
      ...workout,
      image: getRandomPublicWorkoutImage()
    };
  }
};

/**
 * Test function for debugging Firebase Storage access
 * @returns {Promise<boolean>} Success status
 */
export const testStorageAccess = async () => {
  try {
    console.log('🧪 Testing Firebase Storage access...');
    
    // Test public image access
    const publicImage = getRandomPublicWorkoutImage();
    console.log('📸 Public image URL:', publicImage);
    
    // Test user auth
    if (auth.currentUser) {
      console.log('👤 User authenticated:', auth.currentUser.uid);
      
      // Test user image listing
      const userImages = await getUserWorkoutImages(auth.currentUser.uid);
      console.log(`📸 User has ${userImages.length} uploaded images`);
    } else {
      console.log('❌ No user authenticated');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    return false;
  }
};

/**
 * Batch add images to multiple workouts
 * @param {Array} workouts - Array of workout objects
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Array>} Array of workouts with images
 */
export const addImagesToWorkouts = async (workouts, userId = null) => {
  try {
    const workoutsWithImages = await Promise.all(
      workouts.map(workout => addImageToWorkout(workout, userId))
    );
    return workoutsWithImages;
  } catch (error) {
    console.error('❌ Error adding images to workouts:', error);
    // Fallback to adding public images
    return workouts.map(workout => ({
      ...workout,
      image: getRandomPublicWorkoutImage(),
      imageSource: 'public'
    }));
  }
};

/**
 * Test function to verify image service is working
 * @returns {Promise<Object>} Test results
 */
export const testImageService = async () => {
  const results = {
    publicImageAccess: false,
    userAuthenticated: false,
    userImageUpload: false,
    userImageList: false,
    errors: []
  };

  try {
    // Test 1: Public image access
    console.log('🧪 Testing public image access...');
    const publicImage = getRandomPublicWorkoutImage();
    if (publicImage) {
      results.publicImageAccess = true;
      console.log('✅ Public image access: PASS');
    }

    // Test 2: User authentication
    console.log('🧪 Testing user authentication...');
    if (auth.currentUser) {
      results.userAuthenticated = true;
      console.log('✅ User authentication: PASS');

      // Test 3: User image listing
      console.log('🧪 Testing user image listing...');
      const userImages = await getUserWorkoutImages();
      results.userImageList = true;
      console.log(`✅ User image listing: PASS (found ${userImages.length} images)`);
    } else {
      console.log('⚠️ User authentication: SKIP (no user logged in)');
    }

    console.log('🧪 Image service test completed');
    return results;
  } catch (error) {
    console.error('❌ Image service test failed:', error);
    results.errors.push(error.message);
    return results;
  }
};