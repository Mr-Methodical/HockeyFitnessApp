/**
 * Complete Firebase Storage Issue Detector
 * This will test every possible failure point
 */

import { auth, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Alert } from 'react-native';

export const completeStorageTest = async () => {
  const results = {
    authCheck: false,
    storageInit: false,
    referenceCreation: false,
    blobCreation: false,
    uploadAttempt: false,
    downloadUrl: false,
    error: null
  };
  
  try {
    console.log('🔍 === COMPLETE STORAGE DIAGNOSTIC ===\n');
    
    // 1. Authentication Check
    console.log('1️⃣ Checking authentication...');
    if (!auth?.currentUser) {
      throw new Error('No user authenticated - storage requires login');
    }
    results.authCheck = true;
    console.log('✅ User authenticated:', auth.currentUser.uid);
    console.log('✅ User email:', auth.currentUser.email);
    
    // 2. Storage Initialization Check
    console.log('\n2️⃣ Checking storage initialization...');
    if (!storage) {
      throw new Error('Storage not initialized');
    }
    results.storageInit = true;
    console.log('✅ Storage instance exists');
    console.log('✅ Storage bucket:', storage.app.options.storageBucket);
    console.log('✅ Storage app:', storage.app.name);
    
    // 3. Reference Creation Check
    console.log('\n3️⃣ Testing reference creation...');
    const userId = auth.currentUser.uid;
    const timestamp = Date.now();
    const imageName = `test_upload_${timestamp}.jpg`;
    const imageRef = ref(storage, `workouts/${userId}/${imageName}`);
    results.referenceCreation = true;
    console.log('✅ Reference created successfully');
    console.log('✅ Upload path:', imageRef.fullPath);
    console.log('✅ Storage bucket in ref:', imageRef.bucket);
    
    // 4. Blob Creation Check (mimic image conversion)
    console.log('\n4️⃣ Testing blob creation...');
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binaryString = atob(testImageData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    results.blobCreation = true;
    console.log('✅ Blob created successfully');
    console.log('✅ Blob size:', blob.size, 'bytes');
    console.log('✅ Blob type:', blob.type);
    
    // 5. Upload Attempt (this is where your error likely occurs)
    console.log('\n5️⃣ Attempting upload to Firebase Storage...');
    console.log('📤 Starting upload to:', imageRef.fullPath);
    
    const uploadResult = await uploadBytes(imageRef, blob);
    results.uploadAttempt = true;
    console.log('✅ Upload successful!');
    console.log('✅ Upload metadata:');
    console.log('   - Name:', uploadResult.metadata.name);
    console.log('   - Bucket:', uploadResult.metadata.bucket);
    console.log('   - Size:', uploadResult.metadata.size);
    console.log('   - Content Type:', uploadResult.metadata.contentType);
    console.log('   - Time Created:', uploadResult.metadata.timeCreated);
    
    // 6. Download URL Test
    console.log('\n6️⃣ Testing download URL generation...');
    const downloadURL = await getDownloadURL(imageRef);
    results.downloadUrl = true;
    console.log('✅ Download URL generated successfully');
    console.log('✅ URL:', downloadURL);
    
    console.log('\n🎉 === ALL TESTS PASSED ===');
    Alert.alert('Success!', 'Firebase Storage is working perfectly!');
    
    return {
      success: true,
      results,
      downloadURL,
      message: 'All storage operations completed successfully'
    };
    
  } catch (error) {
    console.log('\n❌ === TEST FAILED ===');
    console.error('❌ Error at step:', getFailedStep(results));
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error:', error);
    
    results.error = {
      code: error.code,
      message: error.message,
      step: getFailedStep(results)
    };
    
    // Specific error analysis
    let diagnosis = 'Unknown error';
    let solution = 'Check Firebase configuration';
    
    if (error.message.includes('No user authenticated')) {
      diagnosis = 'User not logged in';
      solution = 'Make sure user is authenticated before uploading images';
    } else if (error.code === 'storage/unknown') {
      diagnosis = 'Firebase Storage not enabled or misconfigured';
      solution = 'Enable Firebase Storage in Firebase Console > Storage > Get Started';
    } else if (error.code === 'storage/unauthorized') {
      diagnosis = 'Permission denied by security rules';
      solution = 'Check Firebase Storage security rules allow authenticated users to write to workouts/{userId}/';
    } else if (error.code === 'storage/unauthenticated') {
      diagnosis = 'Authentication issue';
      solution = 'Verify user is properly authenticated';
    } else if (error.message.includes('fetch')) {
      diagnosis = 'Network or blob creation issue';
      solution = 'Check network connection and image data';
    }
    
    const errorMessage = `Test failed at: ${getFailedStep(results)}\n\nError: ${diagnosis}\n\nSolution: ${solution}`;
    
    Alert.alert('Storage Test Failed', errorMessage);
    
    return {
      success: false,
      results,
      error: results.error,
      diagnosis,
      solution
    };
  }
};

function getFailedStep(results) {
  if (!results.authCheck) return 'Authentication';
  if (!results.storageInit) return 'Storage Initialization';
  if (!results.referenceCreation) return 'Reference Creation';
  if (!results.blobCreation) return 'Blob Creation';
  if (!results.uploadAttempt) return 'Upload Attempt';
  if (!results.downloadUrl) return 'Download URL Generation';
  return 'Unknown';
}

// Quick function to add to any screen for testing
export const testStorageFromScreen = () => {
  console.log('🧪 Running complete storage test...');
  completeStorageTest().then(result => {
    console.log('Test completed:', result.success ? 'SUCCESS' : 'FAILED');
    if (!result.success) {
      console.log('Diagnosis:', result.diagnosis);
      console.log('Solution:', result.solution);
    }
  });
};
