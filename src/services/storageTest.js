/**
 * Simple Storage Test - Run this to check if Firebase Storage is working
 * Import this in any screen and call testFirebaseStorage() when user is logged in
 */

import { auth, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Alert } from 'react-native';

export const testFirebaseStorage = async () => {
  try {
    console.log('🧪 Testing Firebase Storage...');
    
    // Check if user is authenticated
    if (!auth.currentUser) {
      Alert.alert('Test Failed', 'Please log in first');
      return false;
    }
    
    console.log('✅ User authenticated:', auth.currentUser.uid);
    console.log('✅ Storage bucket:', storage.app.options.storageBucket);
    
    // Create a test file
    const testData = 'Hello Firebase Storage Test!';
    const testBlob = new Blob([testData], { type: 'text/plain' });
    
    // Try to upload to the same path your workout images use
    const testPath = `workouts/${auth.currentUser.uid}/test-${Date.now()}.txt`;
    const testRef = ref(storage, testPath);
    
    console.log('📤 Attempting upload to:', testPath);
    
    // This is where your error is probably happening
    const uploadResult = await uploadBytes(testRef, testBlob);
    console.log('✅ Upload successful!');
    
    // Try to get download URL
    const downloadURL = await getDownloadURL(testRef);
    console.log('✅ Download URL:', downloadURL);
    
    Alert.alert('Success!', 'Firebase Storage is working correctly');
    return true;
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    
    let errorMessage = 'Unknown error';
    let fixMessage = '';
    
    switch (error.code) {
      case 'storage/unknown':
        errorMessage = 'Firebase Storage is not enabled';
        fixMessage = 'Go to Firebase Console > Storage > Get Started';
        break;
      case 'storage/unauthorized':
        errorMessage = 'Permission denied';
        fixMessage = 'Update Firebase Storage security rules';
        break;
      case 'storage/unauthenticated':
        errorMessage = 'User not authenticated';
        fixMessage = 'Make sure user is logged in';
        break;
      default:
        errorMessage = error.message;
        fixMessage = 'Check Firebase configuration';
    }
    
    Alert.alert(
      'Storage Test Failed', 
      `Error: ${errorMessage}\n\nFix: ${fixMessage}`,
      [{ text: 'OK' }]
    );
    
    return false;
  }
};
