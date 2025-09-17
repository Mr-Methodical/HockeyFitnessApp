import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';

// Ultra-basic team getter with minimal error handling
export const getBasicTeam = async (teamId) => {
  try {
    console.log('🔍 Getting basic team:', teamId);
    if (!teamId) {
      console.log('❌ No teamId provided');
      return null;
    }
    
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (teamDoc.exists()) {
      console.log('✅ Team found');
      return { id: teamDoc.id, ...teamDoc.data() };
    }
    console.log('⚠️ Team not found');
    return null;
  } catch (error) {
    console.error('❌ Basic team error:', error.message);
    return null; // Return null instead of throwing
  }
};

// Ultra-basic team members getter
export const getBasicTeamMembers = async (teamId) => {
  try {
    console.log('🔍 Getting basic team members:', teamId);
    if (!teamId) {
      console.log('❌ No teamId provided');
      return [];
    }
    
    const membersQuery = query(
      collection(db, 'users'), 
      where('teamId', '==', teamId)
    );
    const querySnapshot = await getDocs(membersQuery);
    
    const members = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${members.length} team members`);
    return members;
  } catch (error) {
    console.error('❌ Basic team members error:', error.message);
    return []; // Return empty array instead of throwing
  }
};

// Ultra-basic user workouts getter
export const getBasicUserWorkouts = async (userId) => {
  try {
    console.log('🔍 Getting basic user workouts:', userId);
    if (!userId) {
      console.log('❌ No userId provided');
      return [];
    }
    
    // Simple query without orderBy to avoid index issues
    const workoutsQuery = query(
      collection(db, 'workouts'),
      where('userId', '==', userId),
      limit(100) // Increase limit for complete workout history
    );
    const querySnapshot = await getDocs(workoutsQuery);
    
    const workouts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Found ${workouts.length} user workouts`);
    return workouts;
  } catch (error) {
    console.error('❌ Basic user workouts error:', error.message);
    return []; // Return empty array instead of throwing
  }
};

// Ultra-basic team workouts getter
export const getBasicTeamWorkouts = async (teamId, workoutLimit = 20) => {
  try {
    console.log('🔍 Getting basic team workouts:', teamId, 'with limit:', workoutLimit);
    if (!teamId) {
      console.log('❌ No teamId provided');
      return [];
    }
    
    // Simple query without orderBy to avoid index issues
    const workoutsQuery = query(
      collection(db, 'workouts'),
      where('teamId', '==', teamId),
      limit(workoutLimit)
    );
    const querySnapshot = await getDocs(workoutsQuery);
    
    const workouts = querySnapshot.docs.map(doc => {
      const data = { id: doc.id, ...doc.data() };
      return data;
    });
    
    console.log(`✅ Found ${workouts.length} team workouts`);
    
    // Debug: Show sample workout data
    if (workouts.length > 0) {
      console.log('📊 Sample team workout:', {
        id: workouts[0].id,
        userId: workouts[0].userId,
        teamId: workouts[0].teamId,
        duration: workouts[0].duration,
        timestamp: workouts[0].timestamp,
        date: workouts[0].date,
        type: workouts[0].type
      });
    }
    
    // Debug: Show all user IDs in workouts
    const userIds = [...new Set(workouts.map(w => w.userId))];
    console.log('📊 Unique user IDs in workouts:', userIds);
    
    return workouts;
  } catch (error) {
    console.error('❌ Basic team workouts error:', error.message);
    return []; // Return empty array instead of throwing
  }
};
