/**
 * Firebase Storage Diagnostic Tool
 * Run this to identify exactly what's wrong with your Storage setup
 */

import { auth, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';

export const runStorageDiagnostics = async () => {
  console.log('🔍 Starting Firebase Storage diagnostics...');
  
  try {
    // Test 1: Check if Storage is initialized
    console.log('📋 Test 1: Storage initialization');
    console.log('✅ Storage instance:', !!storage);
    console.log('✅ Storage app:', storage?.app?.name);
    console.log('✅ Storage bucket:', storage?.app?.options?.storageBucket);
    
    // Test 2: Check authentication
    console.log('\n📋 Test 2: Authentication');
    console.log('✅ Auth instance:', !!auth);
    console.log('✅ Current user:', auth?.currentUser?.uid || 'No user logged in');
    console.log('✅ User email:', auth?.currentUser?.email || 'No email');
    
    if (!auth?.currentUser) {
      throw new Error('No user is logged in. Storage requires authentication.');
    }
    
    // Test 3: Try to create a simple reference
    console.log('\n📋 Test 3: Storage reference creation');
    const testRef = ref(storage, `workouts/${auth.currentUser.uid}/test.txt`);
    console.log('✅ Reference created:', testRef.fullPath);
    
    // Test 4: Try to upload a simple test file
    console.log('\n📋 Test 4: Test file upload');
    const testBlob = new Blob(['Hello Firebase Storage!'], { type: 'text/plain' });
    console.log('✅ Test blob created, size:', testBlob.size);
    
    try {
      const uploadResult = await uploadBytes(testRef, testBlob);
      console.log('✅ Test upload successful!');
      console.log('✅ Upload metadata:', uploadResult.metadata.name);
      
      // Test 5: Get download URL
      console.log('\n📋 Test 5: Download URL generation');
      const downloadURL = await getDownloadURL(testRef);
      console.log('✅ Download URL generated:', downloadURL);
      
      return {
        success: true,
        message: 'All Firebase Storage tests passed!',
        details: {
          storageInitialized: true,
          userAuthenticated: true,
          uploadWorking: true,
          downloadUrlWorking: true
        }
      };
      
    } catch (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      console.error('❌ Upload error code:', uploadError.code);
      console.error('❌ Upload error message:', uploadError.message);
      
      // Diagnose specific error types
      if (uploadError.code === 'storage/unauthorized') {
        return {
          success: false,
          message: 'Firebase Storage permissions error',
          fix: 'Update Firebase Storage security rules to allow authenticated users to upload to workouts/{userId}/',
          details: { errorCode: uploadError.code, userAuthenticated: !!auth?.currentUser }
        };
      } else if (uploadError.code === 'storage/unknown') {
        return {
          success: false,
          message: 'Firebase Storage is not enabled or misconfigured',
          fix: 'Enable Firebase Storage in Firebase Console > Storage > Get Started',
          details: { errorCode: uploadError.code, bucket: storage?.app?.options?.storageBucket }
        };
      } else if (uploadError.code === 'storage/quota-exceeded') {
        return {
          success: false,
          message: 'Firebase Storage quota exceeded',
          fix: 'Check your Firebase Storage usage in Firebase Console',
          details: { errorCode: uploadError.code }
        };
      } else {
        return {
          success: false,
          message: `Unknown storage error: ${uploadError.message}`,
          fix: 'Check Firebase Console for configuration issues',
          details: { errorCode: uploadError.code, fullError: uploadError }
        };
      }
    }
    
  } catch (error) {
    console.error('❌ Diagnostics failed:', error);
    return {
      success: false,
      message: `Diagnostics failed: ${error.message}`,
      fix: 'Check Firebase configuration and network connection',
      details: { error: error.message }
    };
  }
};

// Simplified test for just checking current setup
export const quickStorageTest = async () => {
  try {
    console.log('🚀 Quick Storage Test');
    console.log('Storage bucket:', storage?.app?.options?.storageBucket);
    console.log('User authenticated:', !!auth?.currentUser);
    console.log('User ID:', auth?.currentUser?.uid);
    
    if (!auth?.currentUser) {
      console.log('❌ No user logged in - storage requires authentication');
      return false;
    }
    
    // Try to list files in user's folder (this should work with proper rules)
    const userFolderRef = ref(storage, `workouts/${auth.currentUser.uid}`);
    await listAll(userFolderRef);
    console.log('✅ Storage access working');
    return true;
    
  } catch (error) {
    console.error('❌ Quick test failed:', error.code, error.message);
    return false;
  }
};
