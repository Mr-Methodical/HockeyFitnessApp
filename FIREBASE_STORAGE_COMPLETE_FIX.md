# Firebase Storage Fix Guide

## Current Issue
You're getting: "firebase storage: an unknown error occurred, please check the error payload for server response, maybe it is a permissions or configuration issue"

## Root Cause Analysis
This error typically means one of these issues:

### 1. Firebase Storage Not Enabled
- Firebase Storage service isn't activated in your project
- **Most Common Cause**

### 2. Storage Bucket Misconfigured
- Wrong storage bucket URL in firebase config
- Storage bucket doesn't exist

### 3. Security Rules Issues
- Rules don't allow the upload path your code is using
- Rules require authentication but user isn't properly authenticated

### 4. Network/Configuration Issues
- Network connectivity problems
- Invalid Firebase configuration

## Step-by-Step Fix

### Step 1: Enable Firebase Storage
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. In the left sidebar, click **Storage**
4. If you see "Get Started" button, click it
5. Choose **Start in production mode** (we'll update rules next)
6. Select a location (choose one close to your users)
7. Click **Done**

### Step 2: Update Storage Security Rules
1. In Firebase Console > Storage > Rules tab
2. Replace the current rules with this:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Workout images - users can upload to their own folder
    match /workout-images/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                   request.auth.uid == userId &&
                   resource.size < 10 * 1024 * 1024;
    }
    
    // Public workout images (if you add any)
    match /workouts/public/{allPaths=**} {
      allow read: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

### Step 3: Verify Storage Bucket URL
1. In Firebase Console > Project Settings > General tab
2. Scroll down to "Your apps" section
3. Copy the **Storage bucket** value
4. Make sure your `.env` file has the correct storage bucket:

```env
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### Step 4: Test the Fix

Add this test to your app to verify storage is working:

```javascript
import { runStorageDiagnostics } from './src/services/storageDiagnostics';

// Run this in your app after login
const testStorage = async () => {
  const result = await runStorageDiagnostics();
  console.log('Storage test result:', result);
  if (!result.success) {
    console.log('Fix needed:', result.fix);
  }
};
```

### Step 5: Common Solutions by Error Code

#### Error: `storage/unknown`
- **Cause**: Storage not enabled or wrong bucket
- **Fix**: Enable Storage in Firebase Console

#### Error: `storage/unauthorized` 
- **Cause**: Security rules don't allow the operation
- **Fix**: Update security rules (see Step 2)

#### Error: `storage/unauthenticated`
- **Cause**: User not logged in
- **Fix**: Ensure user is authenticated before upload

#### Error: `storage/quota-exceeded`
- **Cause**: Storage quota exceeded
- **Fix**: Check usage in Firebase Console

### Step 6: Verify Environment Variables
Check your `.env` file has all required Firebase values:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Quick Verification Checklist

- [ ] Firebase Storage is enabled in console
- [ ] Storage security rules are published
- [ ] User is authenticated before upload
- [ ] Storage bucket URL in .env is correct
- [ ] App can connect to Firebase (Firestore working)

## If Still Not Working

1. Run the diagnostic tool I created
2. Check browser console/device logs for exact error codes
3. Verify Firebase project billing is enabled (Storage requires Blaze plan for production)
4. Try uploading a file manually in Firebase Console to test setup

## Most Likely Solution
Based on the error message, Firebase Storage is probably not enabled in your project. Go to Firebase Console > Storage and click "Get Started" if you see it.
