import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  enableNetwork,
  disableNetwork 
} from 'firebase/firestore';

// Utility function to handle Firestore operations with retry logic and better error handling
export const firestoreWithRetry = async (operation, maxRetries = 2, delay = 500) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Firestore operation attempt ${attempt}/${maxRetries}`);
      const result = await operation();
      console.log(`✅ Firestore operation succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`❌ Firestore operation attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain types of errors (permission, not found, etc.)
      if (error.code === 'permission-denied' || 
          error.code === 'not-found' || 
          error.code === 'invalid-argument' ||
          error.message?.includes('assertion') ||
          error.message?.includes('FIRESTORE Internal assertion failed')) {
        console.log(`🚫 Not retrying due to error type: ${error.code || error.message}`);
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        console.log(`🚫 Max retries reached, throwing error`);
        throw lastError;
      }
      
      // Wait before retrying (linear delay instead of exponential)
      const waitTime = delay * attempt;
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};

// Simplified connection check that doesn't spam the console
export const checkFirestoreConnection = async () => {
  try {
    // Simple check without creating unnecessary documents
    const testCollection = collection(db, 'users');
    // This is a lightweight operation that tests connectivity
    await getDocs(query(testCollection, where('__name__', '==', 'non-existent-doc')));
    return true;
  } catch (error) {
    // Only log if it's not a typical offline error
    if (!error.message.includes('offline') && !error.message.includes('Failed to get document')) {
      console.warn('Firestore connection check failed:', error.message);
    }
    return false;
  }
};

// Enhanced user profile getter with retry logic
export const getUserProfileWithRetry = async (userId) => {
  return firestoreWithRetry(async () => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  });
};

// Enhanced team data getter with retry logic
export const getTeamWithRetry = async (teamId) => {
  return firestoreWithRetry(async () => {
    const teamDoc = await getDoc(doc(db, 'teams', teamId));
    if (teamDoc.exists()) {
      return { id: teamDoc.id, ...teamDoc.data() };
    }
    return null;
  });
};

// Enhanced collection query with retry logic
export const getCollectionWithRetry = async (collectionName, queryConstraints = []) => {
  return firestoreWithRetry(async () => {
    let q = collection(db, collectionName);
    
    if (queryConstraints.length > 0) {
      q = query(q, ...queryConstraints);
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });
};

// Enhanced document creation with retry logic
export const createDocumentWithRetry = async (collectionName, data, docId = null) => {
  return firestoreWithRetry(async () => {
    if (docId) {
      await setDoc(doc(db, collectionName, docId), data);
      return docId;
    } else {
      const docRef = await addDoc(collection(db, collectionName), data);
      return docRef.id;
    }
  });
};

// Enhanced document update with retry logic
export const updateDocumentWithRetry = async (collectionName, docId, updates) => {
  return firestoreWithRetry(async () => {
    await updateDoc(doc(db, collectionName, docId), updates);
    return true;
  });
};

// Check network status without forcing operations (safer approach)
export const forceEnableNetwork = async () => {
  try {
    // Instead of forcing enableNetwork, just check if connection works
    // The Firebase SDK handles network management automatically
    const testResult = await checkFirestoreConnection();
    if (testResult) {
      console.log('Firestore connection verified');
      return true;
    } else {
      console.log('Firestore connection check failed, but no force operations needed');
      return false;
    }
  } catch (error) {
    console.warn('Firestore connection check error:', error);
    return false;
  }
};

// Gracefully disable network (useful for testing offline scenarios)
export const gracefullyDisableNetwork = async () => {
  try {
    await disableNetwork(db);
    console.log('Firestore network disabled');
    return true;
  } catch (error) {
    console.warn('Failed to disable Firestore network:', error);
    return false;
  }
};
