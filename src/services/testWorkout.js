// Temporary test version of logWorkout without image upload
// This helps diagnose if the issue is with Storage or Firestore

import { createDocumentWithRetry } from './firestoreUtils';

export const logWorkoutWithoutImage = async (workoutData, userId, teamId) => {
  try {
    console.log('🧪 Testing workout submission without image...');
    
    const workoutDocData = {
      userId: userId,
      teamId: teamId,
      type: workoutData.type,
      duration: workoutData.duration,
      notes: workoutData.notes,
      imageUrl: null, // No image
      timestamp: new Date(),
      createdAt: new Date()
    };
    
    console.log('📝 Saving test workout to Firestore...');
    const result = await createDocumentWithRetry('workouts', workoutDocData);
    console.log('✅ Test workout logged successfully');
    return result;
    
  } catch (error) {
    console.error('❌ Test workout error:', error);
    throw error;
  }
};
