import OpenAI from 'openai';
import { generateWorkoutSecure, generateWorkoutImageSecure, checkBackendHealth, uploadAIImageToStorage } from './backendApi';
import { autoUpdateRankingsAfterWorkout } from './ruleBasedRanking';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { uploadImageWithExpoFix } from './expoImageUpload';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Generate workout using backend or direct API
 * @param {Object} preferences - User preferences for the workout
 * @returns {Object} Generated workout with checklist items
 */
const generateWorkout = async (preferences = {}, userRole = null) => {
  try {
    // First, try the secure backend approach
    const backendAvailable = await checkBackendHealth();
    
    if (backendAvailable) {
      console.log('🔒 Using secure backend for workout generation');
      return await generateWorkoutSecure(preferences, userRole);
    }
    
    // Fallback to direct API call
    console.log('⚠️ Backend unavailable, falling back to direct API call');
    return await generateWorkoutDirect(preferences, userRole);

  } catch (error) {
    console.error('❌ All workout generation methods failed:', error);
    return null;
  }
};

/**
 * Generate workout directly using OpenAI API
 * @param {Object} preferences - User preferences for the workout
 * @returns {Object} Generated workout with checklist items
 */
const generateWorkoutDirect = async (preferences = {}, userRole = null) => {
  try {
    console.log('🤖 Generating workout directly with OpenAI...');
    
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    const { 
      duration = '30',
      focus = 'general fitness',
      equipment = 'none',
      intensity = 'moderate'
    } = preferences;

    // Create role-specific prompts
    let systemPrompt, userPrompt;
    
    if (userRole === 'group_member') {
      // General fitness prompts for group members
      systemPrompt = `You are a professional fitness trainer creating personalized workouts for general fitness enthusiasts. Create engaging, safe, and effective workouts that focus on overall health and fitness.`;
      
      userPrompt = `Create a ${duration}-minute ${intensity} intensity workout focused on ${focus}. Equipment available: ${equipment}.
      
      Return a JSON object with this exact structure:
      {
        "title": "Workout name",
        "description": "Brief description",
        "difficulty": "Beginner/Intermediate/Advanced",
        "estimatedDuration": ${duration},
        "equipment": "${equipment}",
        "warmup": [{"name": "Exercise name", "duration": "5 minutes", "description": "Exercise description", "completed": false}],
        "mainWorkout": [{"name": "Exercise name", "duration": "10 minutes", "description": "Exercise description", "completed": false}],
        "cooldown": [{"name": "Exercise name", "duration": "5 minutes", "description": "Exercise description", "completed": false}]
      }`;
    } else {
      // Hockey-specific prompts for players and coaches
      systemPrompt = `You are a professional hockey trainer creating hockey-specific workouts. Focus on skills that improve on-ice performance, including skating, agility, strength, and hockey-specific movements.`;
      
      userPrompt = `Create a ${duration}-minute ${intensity} intensity hockey training session focused on ${focus}. Equipment available: ${equipment}.
      
      Return a JSON object with this exact structure:
      {
        "title": "Hockey workout name",
        "description": "Brief description of hockey training benefits",
        "difficulty": "Beginner/Intermediate/Advanced",
        "estimatedDuration": ${duration},
        "equipment": "${equipment}",
        "warmup": [{"name": "Hockey warm-up exercise", "duration": "5 minutes", "description": "Hockey-specific warm-up", "completed": false}],
        "mainWorkout": [{"name": "Hockey drill/exercise", "duration": "10 minutes", "description": "Hockey-specific training", "completed": false}],
        "cooldown": [{"name": "Hockey cool-down", "duration": "5 minutes", "description": "Hockey recovery exercise", "completed": false}]
      }`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0].message.content;
    console.log('🤖 Raw OpenAI response:', responseText);

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const workout = JSON.parse(jsonMatch[0]);
    console.log('✅ Workout generated successfully');
    return workout;

  } catch (error) {
    console.error('❌ Direct workout generation failed:', error);
    throw error;
  }
};

/**
 * Generate workout image using backend or direct API
 * @param {string} title - Workout title
 * @param {string} description - Workout description
 * @param {string} userId - User ID
 * @param {string} userRole - User role for content customization
 * @returns {Promise<string|null>} Image URL
 */
const generateWorkoutImage = async (title, description, userId = 'anonymous', userRole = null) => {
  try {
    // First, try the secure backend approach
    const backendAvailable = await checkBackendHealth();
    
    if (backendAvailable) {
      console.log('🔒 Using secure backend for image generation');
      return await generateWorkoutImageSecure(title, description, userId, userRole);
    }
    
    // Fallback to direct API call
    console.log('⚠️ Backend unavailable, falling back to direct API call');
    return await generateWorkoutImageDirect(title, description, userId, userRole);

  } catch (error) {
    console.error('❌ All image generation methods failed:', error);
    return null;
  }
};

/**
 * Generate workout image directly using OpenAI DALL-E
 * @param {string} title - Workout title
 * @param {string} description - Workout description
 * @param {string} userId - User ID
 * @param {string} userRole - User role for content customization
 * @returns {Promise<string|null>} Image URL
 */
const generateWorkoutImageDirect = async (title, description, userId = 'anonymous', userRole = null) => {
  try {
    console.log('🎨 Generating workout image directly with DALL-E...');
    
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Create role-specific image prompts
    let imagePrompt;
    
    if (userRole === 'group_member') {
      // General fitness image prompts
      imagePrompt = `A modern fitness scene showing someone doing ${title}. Clean, motivational style with bright lighting. Focus on proper form and technique. Minimalist background.`;
    } else {
      // Hockey-specific image prompts
      imagePrompt = `A hockey training scene showing ${title}. Professional hockey equipment and setting. Dynamic action shot with ice rink or training facility background. Focus on hockey-specific movements and gear.`;
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const temporaryImageUrl = response.data[0].url;
    console.log('✅ Temporary workout image generated successfully');
    
    // Upload to Firebase Storage for permanent storage
    console.log('📤 Converting temporary AI image to permanent storage...');
    const permanentImageUrl = await uploadAIImageToStorage(temporaryImageUrl, userId);
    
    console.log('✅ AI image permanently stored in Firebase');
    return permanentImageUrl;

  } catch (error) {
    console.error('❌ Direct image generation failed:', error);
    return null;
  }
};

/**
 * Upload workout image to Firebase Storage
 * @param {string} imageUri - Local image URI
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Firebase Storage URL
 */
const uploadWorkoutImage = async (imageUri, userId) => {
  try {
    console.log('📤 Uploading user workout image (AI workout)...');
    
    // Use our working upload service
    
    // Create unique filename for AI workout images
    const timestamp = Date.now();
    const imageName = `ai_workout_${timestamp}.jpg`;
    const imagePath = `workouts/${userId}/${imageName}`;
    
    // Use the enhanced upload method that we know works
    const downloadURL = await uploadImageWithExpoFix(imageUri, imagePath);
    
    if (downloadURL) {
      console.log('✅ AI workout user image uploaded successfully:', downloadURL);
      return downloadURL;
    } else {
      throw new Error('Upload returned null');
    }
    
  } catch (error) {
    console.error('❌ AI workout image upload failed:', error);
    return null;
  }
};

/**
 * Alternative upload method for workout images
 * @param {string} imageUri - Local image URI
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Firebase Storage URL
 */
const uploadWorkoutImageAlternative = async (imageUri, userId) => {
  try {
    console.log('📤 Trying alternative upload method for AI workout...');
    
    // Use our working upload service as the alternative method too
    
    // Create unique filename for AI workout images (alternative path)
    const timestamp = Date.now();
    const imageName = `ai_workout_alt_${timestamp}.jpg`;
    const imagePath = `workouts/${userId}/${imageName}`;
    
    // Use the enhanced upload method that we know works
    const downloadURL = await uploadImageWithExpoFix(imageUri, imagePath);
    
    if (downloadURL) {
      console.log('✅ AI workout alternative image upload successful:', downloadURL);
      return downloadURL;
    } else {
      throw new Error('Alternative upload returned null');
    }
    
  } catch (error) {
    console.error('❌ AI workout alternative upload failed:', error);
    return null;
  }
};

/**
 * Save AI-generated workout to Firestore
 * @param {string} userId - User ID
 * @param {Object} workoutData - Generated workout data
 * @param {number} totalTime - Total workout time in minutes
 * @param {string} teamId - Team ID (optional, for team workout history)
 * @param {string} userImageUri - User-uploaded image URI (optional)
 * @param {string} userRole - User role
 * @returns {Promise<string>} Document ID
 */
const saveAIWorkout = async (userId, workoutData, totalTime, teamId = null, userImageUri = null, userRole = null) => {
  try {
    console.log('💾 Saving AI workout...');
    
    // Handle image: user upload takes priority over AI generation
    let finalImageUrl = null;
    
    if (userImageUri === 'no-image') {
      // User explicitly chose to skip image - don't generate AI image
      console.log('🚫 User chose to skip image - no image will be added');
      finalImageUrl = null;
    } else if (userImageUri && userImageUri !== 'generate-ai') {
      // User provided an image - upload it
      try {
        console.log('📤 User provided image, uploading...');
        finalImageUrl = await uploadWorkoutImage(userImageUri, userId);
      } catch (uploadError) {
        console.error('❌ User image upload failed, trying alternative method:', uploadError);
        
        // Try alternative upload method
        try {
          finalImageUrl = await uploadWorkoutImageAlternative(userImageUri, userId);
        } catch (altUploadError) {
          console.error('❌ Alternative upload also failed, falling back to AI generation:', altUploadError);
          
          // Fall back to AI generation if both upload methods fail
          try {
            finalImageUrl = await generateWorkoutImage(workoutData.title, workoutData.description, userId, userRole);
          } catch (aiError) {
            console.log('📸 All image methods failed, proceeding without image');
            finalImageUrl = null;
          }
        }
      }
    } else {
      // No user image or user wants AI image - generate AI image
      try {
        console.log('🎨 No user image provided, generating AI image...');
        finalImageUrl = await generateWorkoutImage(workoutData.title, workoutData.description, userId, userRole);
      } catch (aiError) {
        console.log('📸 AI image generation failed, proceeding without image');
        finalImageUrl = null;
      }
    }
    
    const workoutDoc = {
      userId,
      teamId, // Add teamId for team workout history
      type: 'AI Workout', // Match the LogWorkoutScreen type
      title: workoutData.title,
      description: workoutData.description,
      notes: `AI-generated workout: ${workoutData.description}. Completed ${[
        ...workoutData.warmup.filter(ex => ex.completed),
        ...workoutData.mainWorkout.filter(ex => ex.completed),
        ...workoutData.cooldown.filter(ex => ex.completed)
      ].length}/${workoutData.warmup.length + workoutData.mainWorkout.length + workoutData.cooldown.length} exercises.`,
      difficulty: workoutData.difficulty,
      duration: totalTime,
      estimatedDuration: workoutData.estimatedDuration,
      equipment: workoutData.equipment,
      image: finalImageUrl, // User-uploaded or AI-generated image
      imageUrl: finalImageUrl, // Also add as imageUrl for consistency with regular workouts
      imageSource: userImageUri === 'no-image' ? 'none' : (userImageUri && userImageUri !== 'generate-ai' ? 'user_upload' : (finalImageUrl ? 'ai_generated' : 'none')), // Track image source
      exercises: {
        warmup: workoutData.warmup,
        mainWorkout: workoutData.mainWorkout,
        cooldown: workoutData.cooldown
      },
      completedExercises: [
        ...workoutData.warmup.filter(ex => ex.completed),
        ...workoutData.mainWorkout.filter(ex => ex.completed),
        ...workoutData.cooldown.filter(ex => ex.completed)
      ].length,
      totalExercises: workoutData.warmup.length + workoutData.mainWorkout.length + workoutData.cooldown.length,
      isAIGenerated: true, // Flag to show AI badge
      createdAt: new Date(),
      timestamp: new Date(), // Add timestamp for proper ordering
      date: new Date(),
      likes: [], // Array of user IDs who liked this workout (for consistency)
      likeCount: 0 // Total count of likes for easy querying (for consistency)
    };

    const docRef = await addDoc(collection(db, 'workouts'), workoutDoc);
    console.log('✅ AI workout saved with ID:', docRef.id);
    console.log('📋 Saved workout document:', JSON.stringify({
      id: docRef.id,
      userId: workoutDoc.userId,
      teamId: workoutDoc.teamId,
      type: workoutDoc.type,
      title: workoutDoc.title,
      isAIGenerated: workoutDoc.isAIGenerated,
      createdAt: workoutDoc.createdAt,
      timestamp: workoutDoc.timestamp
    }, null, 2));
    
    // If user has a teamId, also save to team's workoutHistory subcollection
    if (teamId) {
      try {
        console.log('📝 Also saving workout to team subcollection...');
        const teamWorkoutRef = doc(db, 'teams', teamId, 'workoutHistory', docRef.id);
        await setDoc(teamWorkoutRef, workoutDoc);
        console.log('✅ AI workout also saved to team subcollection');
        
        // Temporarily disable auto-update rankings to prevent errors
        console.log('🔄 Auto-update rankings disabled temporarily');
        // autoUpdateRankingsAfterWorkout(teamId);
      } catch (teamSaveError) {
        console.error('⚠️ Failed to save to team subcollection, but main save succeeded:', teamSaveError);
        // Don't throw here - main save succeeded
      }
    }
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error saving AI workout:', error);
    throw error;
  }
};

/**
 * Get workout suggestions based on user's role and activity
 * @param {string} userId - User ID
 * @param {string} userRole - User role ('player', 'group_member', 'coach')
 * @returns {Array} Array of workout suggestions
 */
const getWorkoutSuggestions = async (userId, userRole = 'group_member') => {
  try {
    // Hockey-specific suggestions for players and coaches
    const hockeySuggestions = [
      {
        title: "Hockey Conditioning",
        duration: "30-45 minutes",
        focus: "cardio and strength",
        description: "High-intensity workout for game conditioning"
      },
      {
        title: "Skill Development",
        duration: "20-30 minutes", 
        focus: "hockey skills",
        description: "Focus on shooting, passing, and puck handling"
      },
      {
        title: "Recovery & Flexibility",
        duration: "15-25 minutes",
        focus: "flexibility and recovery",
        description: "Gentle stretching and mobility work for rest days"
      }
    ];

    // General fitness suggestions for group members
    const generalSuggestions = [
      {
        title: "Full Body Strength",
        duration: "30-45 minutes",
        focus: "strength building",
        description: "Complete strength training for all major muscle groups"
      },
      {
        title: "Cardio Blast",
        duration: "20-30 minutes",
        focus: "cardiovascular fitness",
        description: "High-intensity cardio to improve endurance"
      },
      {
        title: "Recovery & Flexibility",
        duration: "15-25 minutes",
        focus: "flexibility and recovery",
        description: "Gentle stretching and mobility work for rest days"
      }
    ];

    // Return appropriate suggestions based on user role
    if (userRole === 'player' || userRole === 'coach') {
      return hockeySuggestions;
    } else {
      return generalSuggestions;
    }
  } catch (error) {
    console.error('Error getting workout suggestions:', error);
    return [];
  }
};

export {
  generateWorkout,
  generateWorkoutDirect,
  generateWorkoutImage,
  uploadWorkoutImage,
  uploadWorkoutImageAlternative,
  saveAIWorkout,
  getWorkoutSuggestions
};
