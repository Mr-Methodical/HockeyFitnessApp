// Utility function to fix user roles - temporary debugging tool
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Function to manually fix a user's role (for debugging/fixing existing users)
export const fixUserRole = async (userId, newRole) => {
  try {
    console.log(`🔧 Fixing user role for ${userId} to ${newRole}`);
    
    // Get current user data
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const currentData = userDoc.data();
    console.log('📋 Current user data:', {
      name: currentData.name,
      email: currentData.email,
      role: currentData.role,
      teamId: currentData.teamId
    });
    
    // Update the role
    await updateDoc(userRef, {
      role: newRole
    });
    
    // Verify the update
    const updatedDoc = await getDoc(userRef);
    const updatedData = updatedDoc.data();
    
    console.log('✅ Updated user data:', {
      name: updatedData.name,
      email: updatedData.email,
      role: updatedData.role,
      teamId: updatedData.teamId
    });
    
    return { success: true, oldRole: currentData.role, newRole: updatedData.role };
  } catch (error) {
    console.error('❌ Error fixing user role:', error);
    throw error;
  }
};

// Function to debug current user state
export const debugUserState = async (userId) => {
  try {
    console.log('🔍 Debugging user state for:', userId);
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('❌ User document does not exist');
      return null;
    }
    
    const userData = userDoc.data();
    console.log('📋 User document data:', userData);
    
    // Check if user has a team
    if (userData.teamId) {
      const teamRef = doc(db, 'teams', userData.teamId);
      const teamDoc = await getDoc(teamRef);
      
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        console.log('🏒 Team data:', {
          name: teamData.name,
          code: teamData.code,
          coachId: teamData.coachId,
          type: teamData.type || 'team'
        });
        
        // Check if user is the coach of this team
        const isCoachOfTeam = teamData.coachId === userId;
        console.log('👨‍🏫 Is user coach of this team?', isCoachOfTeam);
        
        if (isCoachOfTeam && userData.role !== 'coach') {
          console.log('⚠️ MISMATCH: User is coach of team but role is not "coach"');
          console.log('💡 Suggested fix: Update user role to "coach"');
        }
      }
    }
    
    return userData;
  } catch (error) {
    console.error('❌ Error debugging user state:', error);
    throw error;
  }
};
