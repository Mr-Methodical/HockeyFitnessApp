import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Firebase configuration for Hockey Accountability App
// Using environment variables for security
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
  // Note: measurementId excluded as Analytics is not needed for Expo/React Native
};

// Validate that all required environment variables are present
const requiredEnvVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}. ` +
    'Please check your .env file and ensure all Firebase configuration variables are set.'
  );
}

// Initialize Firebase app (check if already exists to prevent duplicate app error)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with AsyncStorage persistence for React Native
// For React Native, we must use initializeAuth with persistence, not getAuth
let auth;
if (getApps().length === 0) {
  // First initialization - use initializeAuth with AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  // App already exists, get the existing auth instance
  auth = getAuth(app);
}

// Initialize Firestore with settings optimized for Expo development
let db;
try {
  db = getFirestore(app);
  
  // Configure Firestore settings to prevent internal assertion errors
  if (getApps().length === 1) { // Only configure on first initialization
    console.log('🔧 Configuring Firestore settings...');
    
    // Add error handling for internal assertion errors
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Internal assertion failed') || 
          message.includes('unexpected state') ||
          message.includes('(12.0.0)')) {
        // Log these errors but don't crash the app
        console.warn('🔥 Firestore internal error (suppressed):', message);
        return;
      }
      originalError.apply(console, args);
    };
  }
  
} catch (firestoreError) {
  console.error('❌ Firestore initialization error:', firestoreError);
  
  // Try to get existing Firestore instance
  try {
    db = getFirestore();
    console.log('✅ Retrieved existing Firestore instance');
  } catch (fallbackError) {
    console.error('❌ Failed to get Firestore instance:', fallbackError);
    throw new Error('Unable to initialize Firestore. Please restart the app.');
  }
}

// Configure Firestore for better Expo development experience
if (Constants.isDevice === false && __DEV__) {
  console.log('🔧 Development mode detected - Configuring Firestore for Expo');
  
  // In Expo development on web/simulator, WebChannel can be problematic
  // The SDK will automatically handle transport errors and fallback to long polling
  // These warnings are normal and don't affect functionality
  
  // Suppress Firebase transport warnings in development
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('WebChannelConnection RPC') || 
        message.includes('transport errored') ||
        message.includes('stream transport') ||
        message.includes('Firestore operation attempt') ||
        message.includes('expo-image-picker') ||
        message.includes('MediaTypeOptions')) {
      // Suppress WebChannel transport warnings and image picker deprecation in development
      return;
    }
    originalWarn.apply(console, args);
  };
} else {
  console.log('✅ Firestore initialized for production/device');
}

// Initialize Storage
const storage = getStorage(app);

// Add storage debugging in development
if (__DEV__) {
  console.log('🗄️ Firebase Storage initialized');
  console.log('🗄️ Storage bucket:', storage.app.options.storageBucket);
}

export { auth, db, storage };
export default app;
