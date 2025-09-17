/**
 * Emergency Storage Diagnostic - Simple Test
 * Add this to any screen to identify the exact Firebase Storage issue
 */

import { auth, storage } from '../services/firebase';
import { ref, listAll } from 'firebase/storage';
import { Alert } from 'react-native';

export const emergencyStorageTest = async () => {
  console.log('🚨 EMERGENCY STORAGE DIAGNOSTIC 🚨');
  
  try {
    // Test 1: Basic setup
    console.log('\n=== BASIC CHECKS ===');
    console.log('✅ Storage exists:', !!storage);
    console.log('✅ Auth exists:', !!auth);
    console.log('✅ User logged in:', !!auth?.currentUser);
    console.log('✅ Storage bucket:', storage?.app?.options?.storageBucket);
    
    if (!auth?.currentUser) {
      Alert.alert('Test Failed', 'Please log in first');
      return;
    }
    
    // Test 2: Try the simplest possible operation (list root)
    console.log('\n=== TESTING BASIC STORAGE ACCESS ===');
    const rootRef = ref(storage);
    console.log('✅ Root reference created');
    
    // This should work if Storage is enabled, even with lenient rules
    const listResult = await listAll(rootRef);
    console.log('✅ List operation successful!');
    console.log('Found folders:', listResult.prefixes.length);
    console.log('Found files:', listResult.items.length);
    
    Alert.alert('Storage Working!', 'Firebase Storage is properly enabled and accessible');
    return { success: true };
    
  } catch (error) {
    console.log('\n❌ STORAGE TEST FAILED');
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
    
    let diagnosis = '';
    let solution = '';
    
    if (error.code === 'storage/unknown') {
      diagnosis = 'Firebase Storage is not enabled for this project';
      solution = 'Enable Storage in Firebase Console:\n1. Go to Storage\n2. Click "Get Started"\n3. Choose a location';
    } else if (error.message?.includes('network')) {
      diagnosis = 'Network connectivity issue';
      solution = 'Check internet connection and try again';
    } else if (error.code === 'storage/app-deleted') {
      diagnosis = 'Firebase project configuration issue';
      solution = 'Check Firebase project setup and .env configuration';
    } else {
      diagnosis = `Unknown storage error: ${error.code || 'no code'}`;
      solution = 'Check Firebase Console for project status';
    }
    
    Alert.alert(
      'Storage Issue Detected', 
      `Problem: ${diagnosis}\n\nSolution: ${solution}`
    );
    
    return { 
      success: false, 
      error: error.code, 
      message: error.message,
      diagnosis,
      solution 
    };
  }
};
