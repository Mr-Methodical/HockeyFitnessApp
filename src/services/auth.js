import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getUserProfileWithRetry, createDocumentWithRetry } from './firestoreUtils';

// User roles
export const USER_ROLES = {
  COACH: 'coach',
  PLAYER: 'player',
  GROUP_MEMBER: 'group_member'
};

// Sign up new user with retry logic
export const signUp = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user profile in Firestore with retry logic
    const userDocData = {
      email: user.email,
      name: userData.name,
      role: userData.role,
      teamId: userData.teamId || null,
      createdAt: new Date(),
      ...userData
    };
    
    await createDocumentWithRetry('users', userDocData, user.uid);
    
    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

// Sign in existing user
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

// Sign out user
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Get user profile from Firestore with retry logic
export const getUserProfile = async (userId) => {
  try {
    return await getUserProfileWithRetry(userId);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
