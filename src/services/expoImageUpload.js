/**
 * Expo-Compatible Image Upload Service
 * Handles React Native/Expo image URIs properly for Firebase Storage
 */

import { auth, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';

/**
 * Upload image to Firebase Storage with proper Expo URI handling
 * @param {string} imageUri - Image URI from Expo ImagePicker
 * @param {string} userId - User ID for the upload path
 * @returns {Promise<string|null>} Download URL or null if failed
 */
export const uploadImageWithExpoFix = async (imageUri, userId = null) => {
  try {
    const currentUser = auth.currentUser;
    const targetUserId = userId || currentUser?.uid;
    
    if (!targetUserId) {
      throw new Error('No authenticated user found');
    }

    console.log('📤 Starting Expo-compatible image upload...');
    console.log('📷 Image URI:', imageUri);
    console.log('👤 User ID:', targetUserId);
    
    // Create Firebase Storage reference
    const timestamp = Date.now();
    const imageName = `workout_${timestamp}.jpg`;
    const imageRef = ref(storage, `workouts/${targetUserId}/${imageName}`);
    
    console.log('📁 Upload path:', imageRef.fullPath);
    
    let blob;
    
    // Method 1: Try different fetch approaches for React Native
    try {
      console.log('📤 Method 1: Enhanced fetch for React Native...');
      
      // Create a more robust fetch request
      const response = await fetch(imageUri, {
        method: 'GET',
        headers: {
          'Accept': 'image/*',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Check if response has valid content
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) === 0) {
        throw new Error('Empty response from image URI');
      }
      
      blob = await response.blob();
      console.log('✅ Blob created with enhanced fetch, size:', blob.size);
      
    } catch (fetchError) {
      console.log('⚠️ Enhanced fetch failed:', fetchError.message);
      
      // Method 2: Try XMLHttpRequest approach (sometimes works better in React Native)
      try {
        console.log('📤 Method 2: XMLHttpRequest approach...');
        
        blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() {
            if (xhr.status === 200) {
              resolve(xhr.response);
            } else {
              reject(new Error(`XHR failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('XHR network error'));
          xhr.responseType = 'blob';
          xhr.open('GET', imageUri, true);
          xhr.send();
        });
        
        console.log('✅ Blob created with XMLHttpRequest, size:', blob.size);
        
      } catch (xhrError) {
        console.log('⚠️ XMLHttpRequest failed:', xhrError.message);
        throw new Error(`All fetch methods failed. Original error: ${fetchError.message}`);
      }
    }
    
    // Validate blob
    if (!blob || blob.size === 0) {
      throw new Error('Invalid image data - blob is empty');
    }
    
    if (blob.size > 10 * 1024 * 1024) {
      throw new Error('Image too large (max 10MB)');
    }
    
    console.log('✅ Valid blob created, type:', blob.type, 'size:', blob.size);
    
    // Upload to Firebase Storage
    console.log('📤 Uploading to Firebase Storage...');
    
    // For React Native/Expo, we need to ensure proper blob handling
    try {
      // Try method 1: Direct blob upload
      const uploadResult = await uploadBytes(imageRef, blob, {
        contentType: blob.type || 'image/jpeg',
        customMetadata: {
          'uploadSource': 'expo-app'
        }
      });
      console.log('✅ Upload successful with direct blob!');
      
    } catch (uploadError) {
      console.log('⚠️ Direct blob upload failed, trying alternative...');
      console.log('Upload error:', uploadError.message);
      
      // Try method 2: Convert blob to ArrayBuffer for React Native
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const uploadResult = await uploadBytes(imageRef, new Uint8Array(arrayBuffer), {
          contentType: blob.type || 'image/jpeg',
          customMetadata: {
            'uploadSource': 'expo-app-arraybuffer'
          }
        });
        console.log('✅ Upload successful with ArrayBuffer conversion!');
        
      } catch (bufferError) {
        console.log('⚠️ ArrayBuffer upload failed, trying stream upload...');
        
        // Try method 3: Use upload string for React Native
        try {
          // Convert blob to base64 for React Native compatibility
          const reader = new FileReader();
          const base64Data = await new Promise((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result;
              // Remove data URL prefix to get pure base64
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          // Upload using uploadString which is more reliable in React Native
          const uploadResult = await uploadString(imageRef, base64Data, 'base64', {
            contentType: blob.type || 'image/jpeg',
            customMetadata: {
              'uploadSource': 'expo-app-base64'
            }
          });
          console.log('✅ Upload successful with base64 conversion!');
          
        } catch (base64Error) {
          console.error('❌ All upload methods failed');
          throw uploadError; // Throw the original upload error
        }
      }
    }
    
    // Get download URL
    const downloadURL = await getDownloadURL(imageRef);
    console.log('✅ Download URL obtained:', downloadURL);
    
    return downloadURL;
    
  } catch (error) {
    console.error('❌ Expo image upload failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    
    return null;
  }
};
