/**
 * Workout storage service - handles saving workouts without OpenAI dependency
 */
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { uploadImageWithExpoFix } from './expoImageUpload';

/**
 * Save AI-generated workout to Firestore
 * This function was moved from aiWorkout.js to remove OpenAI dependency
 */
export const saveAIWorkout = async (userId, workoutData, totalTime, teamId = null, userImageUri = null, userRole = null) => {
  try {
    console.log('💾 Saving AI workout...');
    console.log('🔍 Workout data:', { totalTime, title: workoutData.title, userId, teamId });
    // Using imported Firebase functions
    
    // Handle image: user upload takes priority
    let finalImageUrl = null;
    
    if (userImageUri === 'no-image') {
      // User explicitly chose to skip image
      console.log('🚫 User chose to skip image - no image will be added');
      finalImageUrl = null;
    } else if (userImageUri && userImageUri !== 'generate-ai') {
      // Check if this is already a valid stock image URL
      if (userImageUri.includes('unsplash.com') || userImageUri.includes('https://')) {
        console.log('🖼️ Using stock image URL directly:', userImageUri);
        finalImageUrl = userImageUri;
      } else {
        // User provided a local image - upload it using our working method
        try {
          console.log('📤 User provided local image, uploading...');
          // Using imported uploadImageWithExpoFix function
          
          // Create unique filename for AI workout images
          const timestamp = Date.now();
          const imageName = `ai_workout_${timestamp}.jpg`;
          const imagePath = `workouts/${userId}/${imageName}`;
          
          // Use the enhanced upload method that we know works
          finalImageUrl = await uploadImageWithExpoFix(userImageUri, imagePath);
          
          if (finalImageUrl) {
            console.log('✅ AI workout user image uploaded successfully:', finalImageUrl);
          } else {
            console.log('⚠️ Upload returned null, proceeding without image');
            finalImageUrl = null;
          }
          
        } catch (uploadError) {
          console.error('❌ AI workout image upload failed:', uploadError);
          console.log('📸 Proceeding without image due to upload failure');
          finalImageUrl = null;
        }
      }
    } else {
      // No user image - use stock images or no image
      console.log('📸 No user image provided - using no image');
      finalImageUrl = null;
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
      image: finalImageUrl,
      imageUrl: finalImageUrl, // Also add as imageUrl for consistency with regular workouts
      imageSource: userImageUri === 'no-image' ? 'none' : 
                   (userImageUri && userImageUri !== 'generate-ai' && (userImageUri.includes('unsplash.com') || userImageUri.includes('https://'))) ? 'stock_image' :
                   (userImageUri && userImageUri !== 'generate-ai') ? 'user_upload' : 
                   (finalImageUrl ? 'ai_generated' : 'none'), // Track image source
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
      isAIGenerated: true, // Flag to show AI badge - workout content is AI generated
      hasAIImage: finalImageUrl && (userImageUri === 'generate-ai' || !userImageUri || userImageUri === null), // Flag to indicate if image is AI-generated
      createdAt: new Date(),
      timestamp: new Date(), // Add timestamp for proper ordering
      date: new Date(),
      likes: [], // Array of user IDs who liked this workout (for consistency)
      likeCount: 0 // Total count of likes for easy querying (for consistency)
    };

    // Debug image source tracking
    console.log('🖼️ Image source tracking:', {
      userImageUri,
      finalImageUrl: finalImageUrl ? 'Has URL' : 'No URL',
      hasAIImage: finalImageUrl && (userImageUri === 'generate-ai' || !userImageUri || userImageUri === null)
    });

    console.log('📋 About to save workout with duration:', workoutDoc.duration);
    const docRef = await addDoc(collection(db, 'workouts'), workoutDoc);
    console.log('✅ AI workout saved with ID:', docRef.id);
    console.log('📋 Saved workout document:', JSON.stringify({
      id: docRef.id,
      userId: workoutDoc.userId,
      teamId: workoutDoc.teamId,
      type: workoutDoc.type,
      title: workoutDoc.title,
      duration: workoutDoc.duration,
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
