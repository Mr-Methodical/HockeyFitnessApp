import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Alert } from 'react-native';
import { db, storage } from './firebase';
import { 
  getTeamWithRetry, 
  getCollectionWithRetry, 
  createDocumentWithRetry, 
  updateDocumentWithRetry,
  firestoreWithRetry 
} from './firestoreUtils';
import { autoUpdateRankingsAfterWorkout } from './ruleBasedRanking';
import { uploadImageWithExpoFix } from './expoImageUpload';

// Generate a random team code
const generateTeamCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create a new team with retry logic
export const createTeam = async (teamData, coachId) => {
  try {
    const teamCode = generateTeamCode();
    const teamRef = doc(collection(db, 'teams'));
    
    const teamDocData = {
      name: teamData.name,
      code: teamCode,
      coachId: coachId,
      createdAt: new Date(),
      imageRequired: false, // Default to optional images
      rankingMode: 'automatic', // 'automatic' or 'manual'
      automaticRankingBy: 'totalMinutes', // 'totalMinutes', 'totalWorkouts', 'thisWeekWorkouts', 'ruleBasedScore'
      manualRankings: [], // Array of player IDs in coach's preferred order
      ...teamData
    };
    
    await createDocumentWithRetry('teams', teamDocData, teamRef.id);
    
    console.log('🏒 Team created, now updating coach role...');
    console.log('🏒 Coach ID:', coachId);
    console.log('🏒 Team ID:', teamRef.id);
    
    // Update creator's teamId and role in their user profile (as coach for teams)
    await updateDoc(doc(db, 'users', coachId), {
      teamId: teamRef.id,
      role: 'coach'
    });
    
    console.log('✅ Coach role updated successfully');
    
    // Verify the update worked
    const updatedUserDoc = await getDoc(doc(db, 'users', coachId));
    if (updatedUserDoc.exists()) {
      const userData = updatedUserDoc.data();
      console.log('🔍 Verified user data after update:', {
        role: userData.role,
        teamId: userData.teamId,
        name: userData.name
      });
    }
    
    return { id: teamRef.id, code: teamCode };
  } catch (error) {
    console.error('Create team error:', error);
    throw error;
  }
};

// Join team by code with retry logic
export const joinTeamByCode = async (teamCode, userId) => {
  try {
    return await firestoreWithRetry(async () => {
      const teamsQuery = query(
        collection(db, 'teams'), 
        where('code', '==', teamCode.toUpperCase())
      );
      const querySnapshot = await getDocs(teamsQuery);
      
      if (querySnapshot.empty) {
        throw new Error('Team not found');
      }
      
      const teamDoc = querySnapshot.docs[0];
      const teamId = teamDoc.id;
      
      // Update user's teamId and role (as player for teams)
      await updateDoc(doc(db, 'users', userId), {
        teamId: teamId,
        role: 'player'
      });
      
      return { teamId, teamData: teamDoc.data() };
    });
  } catch (error) {
    console.error('Join team error:', error);
    throw error;
  }
};

// Create a new group (similar to createTeam but for group members)
export const createGroup = async (groupData, creatorId) => {
  try {
    const groupCode = generateTeamCode();
    const groupRef = doc(collection(db, 'teams'));
    
    const groupDocData = {
      name: groupData.name,
      code: groupCode,
      creatorId: creatorId,
      type: 'group',
      createdAt: new Date(),
      imageRequired: false,
      rankingMode: 'automatic',
      automaticRankingBy: 'totalMinutes',
      manualRankings: []
    };
    
    await setDoc(groupRef, groupDocData);
    
    // Update creator's teamId and role in their user profile
    await updateDoc(doc(db, 'users', creatorId), {
      teamId: groupRef.id,
      role: 'group_member'
    });
    
    return { 
      teamId: groupRef.id, 
      code: groupCode,
      name: groupData.name
    };
  } catch (error) {
    console.error('Create group error:', error);
    throw error;
  }
};

// Join group by code (assigns group_member role instead of player)
export const joinGroupByCode = async (groupCode, userId) => {
  try {
    return await firestoreWithRetry(async () => {
      const teamsQuery = query(
        collection(db, 'teams'), 
        where('code', '==', groupCode.toUpperCase())
      );
      const querySnapshot = await getDocs(teamsQuery);
      
      if (querySnapshot.empty) {
        throw new Error('Group not found');
      }
      
      const teamDoc = querySnapshot.docs[0];
      const teamId = teamDoc.id;
      
      // Update user's teamId and role (as group_member for groups)
      await updateDoc(doc(db, 'users', userId), {
        teamId: teamId,
        role: 'group_member'
      });
      
      return { teamId, teamData: teamDoc.data() };
    });
  } catch (error) {
    console.error('Join group error:', error);
    throw error;
  }
};

// Simple team getter without retry (for dashboard loading)
export const getTeamSimple = async (teamId) => {
  try {
    console.log('🔍 Loading team (simple):', teamId);
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (teamDoc.exists()) {
      return { id: teamDoc.id, ...teamDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting team (simple):', error);
    throw error;
  }
};

// Simple team members getter without retry (for dashboard loading)
export const getTeamMembersSimple = async (teamId) => {
  try {
    console.log('🔍 Loading team members (simple):', teamId);
    const membersQuery = query(
      collection(db, 'users'), 
      where('teamId', '==', teamId)
    );
    const querySnapshot = await getDocs(membersQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Error getting team members (simple):', error);
    throw error;
  }
};

// Simple team workouts getter without retry (for dashboard loading)
export const getTeamWorkoutsSimple = async (teamId, limit = 50) => {
  try {
    console.log('🔍 Loading team workouts (simple):', teamId);
    
    if (!teamId) {
      console.warn('getTeamWorkoutsSimple: No teamId provided');
      return [];
    }

    // Get workouts for the team (simplified - no comments, no orderBy to avoid index issues)
    const workoutsQuery = query(
      collection(db, 'workouts'),
      where('teamId', '==', teamId),
      limit(limit)
    );

    const workoutsSnapshot = await getDocs(workoutsQuery);
    const workouts = workoutsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`✅ Loaded ${workouts.length} workouts (simple)`);
    return workouts;
  } catch (error) {
    console.error('❌ Error getting team workouts (simple):', error);
    throw error;
  }
};

// Get team with retry logic
export const getTeam = async (teamId) => {
  try {
    return await getTeamWithRetry(teamId);
  } catch (error) {
    console.error('Get team error:', error);
    throw error;
  }
};

// Update team settings with retry logic
export const updateTeam = async (teamId, updates) => {
  try {
    return await updateDocumentWithRetry('teams', teamId, updates);
  } catch (error) {
    console.error('Update team error:', error);
    throw error;
  }
};

// Update team settings function
export const updateTeamSettings = async (teamId, settings) => {
  try {
    console.log('Updating team settings:', teamId, settings);
    
    const teamRef = doc(db, 'teams', teamId);
    await updateDoc(teamRef, settings);
    
    console.log('Team settings updated successfully');
  } catch (error) {
    console.error('Error updating team settings:', error);
    throw error;
  }
};

// Get team members with retry logic
export const getTeamMembers = async (teamId) => {
  try {
    return await getCollectionWithRetry('users', [
      where('teamId', '==', teamId)
    ]);
  } catch (error) {
    console.error('Get team members error:', error);
    throw error;
  }
};

// Log a workout with retry logic
export const logWorkout = async (workoutData, userId, teamId, imageUri = null) => {
  try {
    let imageUrl = null;
    
    // Upload image if provided
    if (imageUri) {
      console.log('📤 Starting image upload for workout...');
      console.log('📷 Image URI:', imageUri);
      
      try {
        console.log('📤 Starting image upload with improved Expo handling...');
        
        // Use the Expo-compatible upload method (imported at top)
        imageUrl = await uploadImageWithExpoFix(imageUri, userId);
        
        if (!imageUrl) {
          throw new Error('Image upload returned null - upload failed');
        }
        
        console.log('✅ Image uploaded successfully with Expo fix');
        console.log('✅ Download URL:', imageUrl);
        
      } catch (imageError) {
        console.error('❌ Image upload failed:', imageError);
        console.error('❌ Error message:', imageError.message);
        console.error('❌ Error code:', imageError.code);
        console.error('❌ Error stack:', imageError.stack);
        
        // More detailed error logging
        if (imageError.serverResponse) {
          console.error('❌ Server response:', imageError.serverResponse);
        }
        
        // Check if it's a Storage-specific error
        if (imageError.code) {
          console.error('❌ Firebase error code:', imageError.code);
          
          // Common Firebase Storage error codes
          switch (imageError.code) {
            case 'storage/unknown':
              console.error('❌ Storage unknown error - possibly a permissions or configuration issue');
              break;
            case 'storage/object-not-found':
              console.error('❌ Storage object not found');
              break;
            case 'storage/bucket-not-found':
              console.error('❌ Storage bucket not found');
              break;
            case 'storage/project-not-found':
              console.error('❌ Storage project not found');
              break;
            case 'storage/quota-exceeded':
              console.error('❌ Storage quota exceeded');
              break;
            case 'storage/unauthenticated':
              console.error('❌ Storage unauthenticated - user not signed in');
              break;
            case 'storage/unauthorized':
              console.error('❌ Storage unauthorized - check Storage rules');
              break;
            case 'storage/retry-limit-exceeded':
              console.error('❌ Storage retry limit exceeded');
              break;
            case 'storage/invalid-checksum':
              console.error('❌ Storage invalid checksum');
              break;
            case 'storage/canceled':
              console.error('❌ Storage operation canceled');
              break;
            case 'storage/invalid-event-name':
              console.error('❌ Storage invalid event name');
              break;
            case 'storage/invalid-url':
              console.error('❌ Storage invalid URL');
              break;
            case 'storage/invalid-argument':
              console.error('❌ Storage invalid argument');
              break;
            case 'storage/no-default-bucket':
              console.error('❌ Storage no default bucket configured');
              break;
            case 'storage/cannot-slice-blob':
              console.error('❌ Storage cannot slice blob');
              break;
            case 'storage/server-file-wrong-size':
              console.error('❌ Storage server file wrong size');
              break;
            default:
              console.error('❌ Unknown storage error code:', imageError.code);
          }
        }
        
        // For now, continue without image rather than failing the entire workout
        console.log('⚠️ Continuing workout submission without image...');
        Alert.alert('Image Upload Failed', `Your workout will be saved without the image. Error: ${imageError.message}`);
        imageUrl = null;
      }
    }
    
    const workoutDocData = {
      userId: userId,
      teamId: teamId,
      type: workoutData.type,
      duration: workoutData.duration,
      notes: workoutData.notes,
      imageUrl: imageUrl,
      timestamp: new Date(),
      createdAt: new Date(),
      likes: [], // Array of user IDs who liked this workout
      likeCount: 0 // Total count of likes for easy querying
    };
    
    console.log('📝 Saving workout to Firestore...');
    const result = await createDocumentWithRetry('workouts', workoutDocData);
    console.log('✅ Workout logged successfully with ID:', result);
    
    // Temporarily disable auto-update rankings to prevent errors
    console.log('🔄 Auto-update rankings disabled temporarily');
    /*
    // Auto-update team rankings after workout is logged
    if (teamId) {
      autoUpdateRankingsAfterWorkout(teamId);
    }
    */
    
    return result;
    
  } catch (error) {
    console.error('Log workout error:', error);
    throw error;
  }
};

// Get team workouts with retry logic
export const getTeamWorkouts = async (teamId, limit = 50) => {
  try {
    if (!teamId) {
      console.warn('getTeamWorkouts: No teamId provided');
      return [];
    }

    console.log('🔍 Fetching team workouts for teamId:', teamId);
    
    const workouts = await getCollectionWithRetry('workouts', [
      where('teamId', '==', teamId)
    ]);

    console.log('🔍 Found', workouts.length, 'workouts');

    // Sort by most recent first (use createdAt instead of timestamp)
    const sortedWorkouts = workouts.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bTime - aTime;
    });

    // Get comment counts for each workout with better error handling
    const workoutsWithComments = await Promise.allSettled(
      sortedWorkouts.slice(0, limit).map(async (workout) => {
        try {
          if (!workout.id) {
            console.warn('Workout missing ID:', workout);
            return {
              ...workout,
              commentCount: 0
            };
          }

          const comments = await getCollectionWithRetry(`workouts/${workout.id}/comments`, []);
          return {
            ...workout,
            commentCount: comments.length
          };
        } catch (error) {
          console.warn('Error getting comments for workout:', workout.id, error);
          return {
            ...workout,
            commentCount: 0
          };
        }
      })
    );

    // Extract successful results and handle failed ones
    const results = workoutsWithComments.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.warn('Failed to process workout:', result.reason);
        return null;
      }
    }).filter(Boolean);

    console.log('🔍 Processed', results.length, 'workouts with comments');
    return results;
  } catch (error) {
    console.error('Get team workouts error:', error);
    // If index error, return empty array temporarily
    if (error.message && error.message.includes('requires an index')) {
      console.log('⚠️ Index not yet available, returning empty workouts array');
      return [];
    }
    throw error;
  }
};

// Test Storage connection
export const testStorageConnection = async () => {
  try {
    console.log('🧪 Testing Firebase Storage connection...');
    console.log('🗄️ Storage bucket:', storage.app.options.storageBucket);
    
    // Try to create a simple text file to test storage
    const testRef = ref(storage, 'test/connection-test.txt');
    const testData = new Blob(['Hello Storage!'], { type: 'text/plain' });
    
    console.log('🧪 Attempting to upload test file...');
    const uploadResult = await uploadBytes(testRef, testData);
    console.log('✅ Test upload successful:', uploadResult.metadata.name);
    
    const downloadURL = await getDownloadURL(testRef);
    console.log('✅ Test download URL obtained:', downloadURL);
    
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error('❌ Storage connection test failed:', error);
    return { success: false, error: error.message };
  }
};

// Simple user workouts getter without retry (for dashboard loading)
export const getUserWorkoutsSimple = async (userId) => {
  try {
    console.log('🔍 Loading user workouts (simple):', userId);
    const workoutsQuery = query(
      collection(db, 'workouts'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(workoutsQuery);
    
    const workouts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Loaded ${workouts.length} user workouts (simple)`);
    return workouts;
  } catch (error) {
    console.error('❌ Error getting user workouts (simple):', error);
    // If index error, return empty array temporarily
    if (error.message && error.message.includes('requires an index')) {
      console.log('⚠️ Index not yet available, returning empty workouts array');
      return [];
    }
    throw error;
  }
};

// Get user workouts with retry logic
export const getUserWorkouts = async (userId) => {
  try {
    return await getCollectionWithRetry('workouts', [
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    ]);
  } catch (error) {
    console.error('Get user workouts error:', error);
    // If index error, return empty array temporarily
    if (error.message && error.message.includes('requires an index')) {
      console.log('⚠️ Index not yet available, returning empty workouts array');
      return [];
    }
    throw error;
  }
};

// Add a comment to a workout
export const addWorkoutComment = async (workoutId, commentData, userId) => {
  try {
    const commentRef = doc(collection(db, 'workouts', workoutId, 'comments'));
    const commentDocData = {
      text: commentData.text,
      userId: userId,
      userName: commentData.userName,
      userRole: commentData.userRole, // 'coach' or 'player'
      createdAt: new Date(),
      timestamp: new Date()
    };
    
    await createDocumentWithRetry(`workouts/${workoutId}/comments`, commentDocData, commentRef.id);
    return { id: commentRef.id, ...commentDocData };
  } catch (error) {
    console.error('Add workout comment error:', error);
    throw error;
  }
};

// Get comments for a workout
export const getWorkoutComments = async (workoutId) => {
  try {
    return await getCollectionWithRetry(`workouts/${workoutId}/comments`, [
      orderBy('timestamp', 'desc')
    ]);
  } catch (error) {
    console.error('Get workout comments error:', error);
    // Return empty array if comments collection doesn't exist yet
    return [];
  }
};

// Direct messaging functions
// Send a message (coaches to players, or players responding to coaches)
export const sendDirectMessage = async (messageData, senderId) => {
  try {
    const messageRef = doc(collection(db, 'messages'));
    const messageDocData = {
      text: messageData.text,
      senderId: senderId,
      senderName: messageData.senderName,
      senderRole: messageData.senderRole,
      recipientId: messageData.recipientId,
      recipientName: messageData.recipientName,
      recipientRole: messageData.recipientRole,
      teamId: messageData.teamId,
      timestamp: new Date(),
      createdAt: new Date(),
      read: false
    };
    
    await createDocumentWithRetry('messages', messageDocData, messageRef.id);
    console.log('📧 Direct message sent to:', messageData.recipientName);
    
    return { id: messageRef.id, ...messageDocData };
  } catch (error) {
    console.error('Send direct message error:', error);
    throw error;
  }
};

// Group chat messaging functions
// Get unread message count for direct messages between two users
export const getUnreadMessageCount = async (currentUserId, partnerId) => {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('recipientId', '==', currentUserId),
      where('senderId', '==', partnerId),
      where('read', '==', false),
      limit(100) // Limit for performance
    );

    const snapshot = await getDocs(q);
    const unreadCount = snapshot.docs.length;
    
    console.log(`🔢 User ${currentUserId} has ${unreadCount} unread messages from ${partnerId}`);
    return unreadCount;
  } catch (error) {
    console.error('Get unread message count error:', error);
    return 0;
  }
};

// Get unread group message count for a user
export const getUnreadGroupMessageCount = async (teamId, userId) => {
  try {
    const groupMessagesRef = collection(db, 'groupMessages');
    // Simple query with only teamId filter to avoid index requirements
    const q = query(
      groupMessagesRef,
      where('teamId', '==', teamId),
      limit(100) // Limit for performance
    );

    const snapshot = await getDocs(q);
    
    let unreadCount = 0;
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Skip own messages
      if (data.senderId === userId) {
        return;
      }
      
      const readBy = data.readBy || [];
      // If readBy doesn't exist, treat as unread for backwards compatibility
      if (!readBy.includes(userId)) {
        unreadCount++;
      }
    });

    console.log(`🔢 User ${userId} has ${unreadCount} unread group messages in team ${teamId}`);
    return unreadCount;
  } catch (error) {
    console.error('Get unread group message count error:', error);
    return 0;
  }
};

// Mark group messages as read for a specific user
export const markGroupMessagesAsRead = async (teamId, userId) => {
  try {
    console.log(`🔵 Marking group messages as read for user ${userId} in team ${teamId}`);
    
    const groupMessagesRef = collection(db, 'groupMessages');
    // Simple query with only teamId filter to avoid index requirements
    const q = query(
      groupMessagesRef,
      where('teamId', '==', teamId),
      limit(100) // Limit for performance
    );

    const snapshot = await getDocs(q);
    
    let updatedCount = 0;
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Skip own messages
      if (data.senderId === userId) {
        return;
      }
      
      const readBy = data.readBy || [];
      
      // Only update if user hasn't read this message yet
      if (!readBy.includes(userId)) {
        const updatedReadBy = [...readBy, userId];
        batch.update(doc.ref, { readBy: updatedReadBy });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`✅ Marked ${updatedCount} group messages as read for user ${userId}`);
    } else {
      console.log(`📖 No unread group messages found for user ${userId}`);
    }

    return updatedCount;
  } catch (error) {
    console.error('Mark group messages as read error:', error);
    throw error;
  }
};

// Send a group chat message (everyone in the team/group can see it)
export const sendGroupMessage = async (messageData, senderId) => {
  try {
    const messageRef = doc(collection(db, 'groupMessages'));
    const messageDocData = {
      text: messageData.text,
      senderId: senderId,
      senderName: messageData.senderName,
      senderRole: messageData.senderRole,
      teamId: messageData.teamId,
      timestamp: new Date(),
      createdAt: new Date(),
      type: 'group',
      readBy: [senderId] // Sender has "read" their own message
    };
    
    await createDocumentWithRetry('groupMessages', messageDocData, messageRef.id);
    console.log('📢 Group message sent to team:', messageData.teamId);
    
    return { id: messageRef.id, ...messageDocData };
  } catch (error) {
    console.error('Send group message error:', error);
    throw error;
  }
};

// Get group chat messages for a team
export const getGroupMessages = async (teamId) => {
  try {
    console.log('🔍 Getting group messages for team:', teamId);
    
    // First try with orderBy (requires index)
    try {
      const messages = await getCollectionWithRetry('groupMessages', [
        where('teamId', '==', teamId),
        orderBy('timestamp', 'asc')
      ]);
      
      console.log(`📨 Found ${messages.length} group messages with orderBy`);
      return messages;
    } catch (indexError) {
      console.log('⚠️ Index not available, falling back to client-side sorting');
      
      // Fallback: just filter by teamId and sort client-side
      const messages = await getCollectionWithRetry('groupMessages', [
        where('teamId', '==', teamId)
      ]);
      
      // Sort messages by timestamp on client side
      const sortedMessages = messages.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return timeA - timeB;
      });
      
      console.log(`📨 Found ${sortedMessages.length} group messages with client sorting`);
      return sortedMessages;
    }
  } catch (error) {
    console.error('Get group messages error:', error);
    throw error;
  }
};

// Get conversations for a user (both sent and received messages)
export const getUserConversations = async (userId) => {
  try {
    const [sentMessages, receivedMessages] = await Promise.all([
      getCollectionWithRetry('messages', [
        where('senderId', '==', userId)
      ]),
      getCollectionWithRetry('messages', [
        where('recipientId', '==', userId)
      ])
    ]);

    // Combine and group messages by conversation partner
    const allMessages = [...sentMessages, ...receivedMessages];
    const conversations = {};

    allMessages.forEach(message => {
      const partnerId = message.senderId === userId ? message.recipientId : message.senderId;
      const partnerName = message.senderId === userId ? message.recipientName : message.senderName;
      const partnerRole = message.senderId === userId ? message.recipientRole : message.senderRole;

      if (!conversations[partnerId]) {
        conversations[partnerId] = {
          partnerId,
          partnerName,
          partnerRole,
          messages: [],
          lastMessage: null,
          unreadCount: 0
        };
      }

      conversations[partnerId].messages.push(message);
      
      // Set last message (most recent)
      if (!conversations[partnerId].lastMessage || 
          message.timestamp > conversations[partnerId].lastMessage.timestamp) {
        conversations[partnerId].lastMessage = message;
      }

      // Count unread messages (messages received by this user that are unread)
      if (message.recipientId === userId && !message.read) {
        conversations[partnerId].unreadCount++;
      }
    });

    // Sort conversations by last message timestamp
    return Object.values(conversations).sort((a, b) => 
      b.lastMessage.timestamp - a.lastMessage.timestamp
    );
  } catch (error) {
    console.error('Get user conversations error:', error);
    return [];
  }
};

// Get messages between two users
export const getConversationMessages = async (userId1, userId2) => {
  try {
    const [messages1, messages2] = await Promise.all([
      getCollectionWithRetry('messages', [
        where('senderId', '==', userId1),
        where('recipientId', '==', userId2)
      ]),
      getCollectionWithRetry('messages', [
        where('senderId', '==', userId2),
        where('recipientId', '==', userId1)
      ])
    ]);

    // Combine and sort messages chronologically
    const allMessages = [...messages1, ...messages2];
    return allMessages.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return [];
  }
};

// Mark messages as read
export const markMessagesAsRead = async (messageIds) => {
  try {
    console.log('📖 Marking messages as read:', messageIds);
    const updatePromises = messageIds.map(messageId =>
      updateDocumentWithRetry('messages', messageId, { read: true })
    );
    await Promise.all(updatePromises);
    console.log('✅ Successfully marked', messageIds.length, 'messages as read');
  } catch (error) {
    console.error('❌ Mark messages as read error:', error);
    throw error;
  }
};

// Send mass message to multiple players
export const sendMassMessage = async (messageData, senderId, recipientIds) => {
  try {
    const messagePromises = recipientIds.map(async (recipientId) => {
      const messageRef = doc(collection(db, 'messages'));
      const messageDocData = {
        text: messageData.text,
        senderId: senderId,
        senderName: messageData.senderName,
        senderRole: messageData.senderRole,
        recipientId: recipientId.id,
        recipientName: recipientId.name,
        recipientRole: 'player',
        teamId: messageData.teamId,
        timestamp: new Date(),
        createdAt: new Date(),
        read: false,
        isMassMessage: true
      };
      
      await createDocumentWithRetry('messages', messageDocData, messageRef.id);
      
      return { id: messageRef.id, ...messageDocData };
    });

    const results = await Promise.all(messagePromises);
    console.log(`📬 Mass message sent to ${results.length} recipients`);
    return results;
  } catch (error) {
    console.error('Send mass message error:', error);
    throw error;
  }
};

// Like/Unlike workout functions
export const toggleWorkoutLike = async (workoutId, userId) => {
  try {
    console.log('Toggling like for workout:', workoutId, 'by user:', userId);
    
    const workoutRef = doc(db, 'workouts', workoutId);
    const workoutDoc = await getDoc(workoutRef);
    
    if (!workoutDoc.exists()) {
      throw new Error('Workout not found');
    }
    
    const workoutData = workoutDoc.data();
    const currentLikes = workoutData.likes || [];
    const userHasLiked = currentLikes.includes(userId);
    
    let updatedLikes;
    let updatedLikeCount;
    
    if (userHasLiked) {
      // Remove like
      updatedLikes = currentLikes.filter(id => id !== userId);
      updatedLikeCount = Math.max(0, (workoutData.likeCount || 0) - 1);
    } else {
      // Add like
      updatedLikes = [...currentLikes, userId];
      updatedLikeCount = (workoutData.likeCount || 0) + 1;
    }
    
    await updateDoc(workoutRef, {
      likes: updatedLikes,
      likeCount: updatedLikeCount
    });
    
    console.log('Like toggled successfully. New like count:', updatedLikeCount);
    return { liked: !userHasLiked, likeCount: updatedLikeCount };
    
  } catch (error) {
    console.error('Error toggling workout like:', error);
    throw error;
  }
};

export const getWorkoutLikes = async (workoutId) => {
  try {
    const workoutRef = doc(db, 'workouts', workoutId);
    const workoutDoc = await getDoc(workoutRef);
    
    if (!workoutDoc.exists()) {
      return { likes: [], likeCount: 0 };
    }
    
    const workoutData = workoutDoc.data();
    return {
      likes: workoutData.likes || [],
      likeCount: workoutData.likeCount || 0
    };
  } catch (error) {
    console.error('Error getting workout likes:', error);
    throw error;
  }
};

// Remove a player from the team (coach only)
export const removePlayerFromTeam = async (teamId, playerId, coachId) => {
  try {
    // Verify the requester is the coach of the team
    const team = await getTeam(teamId);
    if (!team || team.coachId !== coachId) {
      throw new Error('Only the team coach can remove players');
    }

    // Update the player's user profile to remove team association
    const playerRef = doc(db, 'users', playerId);
    await updateDoc(playerRef, {
      teamId: null,
      role: 'player' // Keep as player but remove team
    });

    // Remove player from any manual rankings
    if (team.manualRankings && Array.isArray(team.manualRankings)) {
      const updatedRankings = team.manualRankings.filter(id => id !== playerId);
      await updateTeamSettings(teamId, { manualRankings: updatedRankings });
    }

    console.log(`Player ${playerId} removed from team ${teamId}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing player from team:', error);
    throw error;
  }
};

// Delete a workout post (coach only)
export const deleteWorkout = async (workoutId, userId, teamId) => {
  try {
    // Get the workout to verify it exists and get team info
    const workoutRef = doc(db, 'workouts', workoutId);
    const workoutDoc = await getDoc(workoutRef);
    
    if (!workoutDoc.exists()) {
      throw new Error('Workout not found');
    }

    const workoutData = workoutDoc.data();
    
    // Verify the requester is either the workout owner or the team coach
    const team = await getTeam(teamId);
    const isCoach = team && team.coachId === userId;
    const isOwner = workoutData.userId === userId;
    
    if (!isCoach && !isOwner) {
      throw new Error('Only the workout owner or team coach can delete workouts');
    }

    // Delete the workout document
    await deleteDoc(workoutRef);
    
    console.log(`Workout ${workoutId} deleted by ${isCoach ? 'coach' : 'owner'}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting workout:', error);
    throw error;
  }
};
