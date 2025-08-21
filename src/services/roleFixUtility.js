import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

// Utility to fix user roles based on their team/group context
export const fixAllUserRoles = async () => {
  try {
    console.log('🔧 Starting intelligent role fix utility...');
    
    // Get all users and teams
    const [usersSnapshot, teamsSnapshot] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'teams'))
    ]);
    
    // Create a map of team data
    const teamsMap = {};
    teamsSnapshot.forEach((teamDoc) => {
      const teamData = teamDoc.data();
      teamsMap[teamDoc.id] = {
        ...teamData,
        id: teamDoc.id
      };
    });
    
    const updates = [];
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const currentRole = userData.role;
      const teamId = userData.teamId;
      const userId = userDoc.id;
      
      console.log(`👤 User ${userData.name || userId}: role=${currentRole}, teamId=${teamId}`);
      
      if (teamId && teamsMap[teamId]) {
        const team = teamsMap[teamId];
        let correctRole = null;
        
        // Determine correct role based on team structure
        if (team.coachId === userId) {
          // User is the coach of this team
          correctRole = 'coach';
        } else if (team.creatorId === userId && team.type === 'group') {
          // User created a group, so they should be a group_member
          correctRole = 'group_member';
        } else if (team.type === 'group') {
          // User joined a group, so they should be a group_member
          correctRole = 'group_member';
        } else {
          // User joined a regular team, so they should be a player
          correctRole = 'player';
        }
        
        if (currentRole !== correctRole) {
          updates.push({
            id: userId,
            name: userData.name || 'Unknown',
            currentRole: currentRole,
            correctRole: correctRole,
            teamType: team.type || 'team',
            isCreator: team.coachId === userId || team.creatorId === userId
          });
        }
      }
    });
    
    console.log(`🔧 Found ${updates.length} users that need role updates:`, updates);
    
    // Update all users to their correct roles
    for (const update of updates) {
      console.log(`🔧 Updating ${update.name} from ${update.currentRole} to ${update.correctRole} (${update.teamType})`);
      const userRef = doc(db, 'users', update.id);
      await updateDoc(userRef, {
        role: update.correctRole,
        updatedAt: new Date()
      });
    }
    
    console.log('✅ All user roles fixed based on team context');
    return { success: true, updatedCount: updates.length, updates };
    
  } catch (error) {
    console.error('❌ Error fixing user roles:', error);
    throw error;
  }
};

// Get current roles for debugging
export const debugUserRoles = async () => {
  try {
    console.log('🔍 Debugging user roles...');
    
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const roleCount = {};
    const userDetails = [];
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const role = userData.role || 'no_role';
      
      roleCount[role] = (roleCount[role] || 0) + 1;
      userDetails.push({
        id: userDoc.id,
        name: userData.name || 'Unknown',
        role: role,
        teamId: userData.teamId || 'none'
      });
    });
    
    console.log('📊 Role distribution:', roleCount);
    console.log('👥 User details:', userDetails);
    
    return { roleCount, userDetails };
    
  } catch (error) {
    console.error('❌ Error debugging user roles:', error);
    throw error;
  }
};
