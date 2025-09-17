/**
 * Network-Level Storage Diagnostic
 * This will help us see if it's a network/CORS issue
 */

import { auth, storage } from '../services/firebase';
import { ref, uploadBytes } from 'firebase/storage';

export const networkStorageTest = async () => {
  console.log('🌐 NETWORK-LEVEL STORAGE TEST');
  
  try {
    // Log all the details we can see
    console.log('=== CONFIGURATION DETAILS ===');
    console.log('Auth user:', auth?.currentUser?.uid);
    console.log('Storage app name:', storage?.app?.name);
    console.log('Storage bucket from config:', storage?.app?.options?.storageBucket);
    console.log('Storage instance type:', typeof storage);
    console.log('Firebase apps count:', require('firebase/app').getApps().length);
    
    if (!auth?.currentUser) {
      throw new Error('Not authenticated');
    }
    
    // Test the exact upload that's failing
    const userId = auth.currentUser.uid;
    const testRef = ref(storage, `workouts/${userId}/network-test-${Date.now()}.txt`);
    
    console.log('=== UPLOAD ATTEMPT ===');
    console.log('Reference full path:', testRef.fullPath);
    console.log('Reference bucket:', testRef.bucket);
    console.log('Reference toString:', testRef.toString());
    
    // Create the smallest possible valid blob
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    console.log('Blob size:', testBlob.size);
    console.log('Blob type:', testBlob.type);
    
    // Monitor the upload closely
    console.log('🚀 Starting upload...');
    
    // Set a timeout to catch hanging uploads
    const uploadPromise = uploadBytes(testRef, testBlob);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000);
    });
    
    const result = await Promise.race([uploadPromise, timeoutPromise]);
    
    console.log('✅ Upload completed successfully!');
    console.log('Result:', result);
    
    return { success: true, message: 'Upload successful' };
    
  } catch (error) {
    console.log('❌ NETWORK TEST FAILED');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    console.log('Error toString:', error.toString());
    
    // Log the full error object structure
    console.log('Full error object keys:', Object.keys(error));
    
    // Try to extract more details
    if (error.cause) {
      console.log('Error cause:', error.cause);
    }
    
    if (error.stack) {
      console.log('Error stack (first 500 chars):', error.stack.substring(0, 500));
    }
    
    // Check for specific patterns
    if (error.message?.includes('timeout')) {
      return { 
        success: false, 
        diagnosis: 'Network timeout - connection to Firebase Storage is slow or blocked',
        suggestion: 'Try on different network or check firewall settings'
      };
    } else if (error.message?.includes('CORS')) {
      return { 
        success: false, 
        diagnosis: 'CORS (Cross-Origin) issue',
        suggestion: 'This is common in Expo development - try on physical device'
      };
    } else if (error.code === 'storage/unknown') {
      return { 
        success: false, 
        diagnosis: 'Firebase Storage service error',
        suggestion: 'Storage might be misconfigured or down'
      };
    }
    
    return { 
      success: false, 
      error: error.code || error.name,
      message: error.message,
      diagnosis: 'Unknown network or configuration issue'
    };
  }
};
