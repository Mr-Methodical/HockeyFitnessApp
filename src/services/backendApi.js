// Backend API service for secure AI requests
const BACKEND_URL = __DEV__ 
  ? 'http://192.168.254.6:3001' // Replace with your computer's IP for Expo
  : 'https://your-production-backend.com'; // Replace with your production backend URL

/**
 * Generate workout using secure backend API
 * @param {Object} preferences - User workout preferences
 * @returns {Object} Generated workout data
 */
export const generateWorkoutSecure = async (preferences = {}, userRole = null) => {
  try {
    console.log('🔒 Generating workout via secure backend...');
    
    const response = await fetch(`${BACKEND_URL}/api/ai/generate-workout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ preferences, userRole }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate workout');
    }

    const data = await response.json();
    console.log('✅ Workout generated via backend');
    return data.workout;

  } catch (error) {
    console.error('🔒 Backend workout generation failed:', error);
    throw error;
  }
};

/**
 * Generate workout image using secure backend API
 * @param {string} title - Workout title
 * @param {string} description - Workout description
 * @param {string} userId - User ID for storage path
 * @returns {string} Image URL
 */
export const generateWorkoutImageSecure = async (title, description, userId = 'anonymous', userRole = null) => {
  try {
    console.log('🔒 Generating workout image via secure backend...');
    
    const response = await fetch(`${BACKEND_URL}/api/ai/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, description, userRole }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate image');
    }

    const data = await response.json();
    console.log('✅ Image generated via backend');
    
    // The backend returns a temporary DALL-E URL, so we need to download and upload it to Firebase Storage
    const permanentUrl = await uploadAIImageToStorage(data.imageUrl, userId);
    return permanentUrl;

  } catch (error) {
    console.error('🔒 Backend image generation failed:', error);
    throw error;
  }
};

/**
 * Upload AI-generated image to Firebase Storage for permanent storage
 * @param {string} temporaryImageUrl - Temporary DALL-E image URL
 * @param {string} userId - User ID for storage path
 * @returns {string} Firebase Storage download URL
 */
export const uploadAIImageToStorage = async (temporaryImageUrl, userId = 'anonymous') => {
  try {
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('./firebase');
    
    console.log('📤 Downloading and uploading AI image to Firebase Storage...');
    
    // Download the temporary image
    const response = await fetch(temporaryImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch AI image: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('📤 AI image blob created, size:', blob.size, 'bytes');
    
    // Create unique filename and use the existing workouts path structure
    const timestamp = Date.now();
    const imageName = `ai_generated_${timestamp}.jpg`;
    const imageRef = ref(storage, `workouts/${userId}/${imageName}`);
    
    // Upload to Firebase Storage
    const uploadResult = await uploadBytes(imageRef, blob);
    console.log('✅ AI image uploaded to Firebase Storage successfully');
    
    // Get permanent download URL
    const downloadURL = await getDownloadURL(imageRef);
    console.log('✅ Permanent AI image URL obtained:', downloadURL);
    
    return downloadURL;
    
  } catch (error) {
    console.error('❌ AI image upload to Firebase Storage failed:', error);
    throw error;
  }
};

/**
 * Check if backend is available
 * @returns {boolean} Backend availability status
 */
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    
    return response.ok;
  } catch (error) {
    console.log('Backend health check failed:', error);
    return false;
  }
};
