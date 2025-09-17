# Firebase Storage Setup & Image Upload Fix

## Issue Summary
Your Hockey Accountability App is getting "Firebase Storage: unknown error occurred" when users try to upload workout images. This happens because Firebase Storage is not enabled in your Firebase project.

## Root Cause
Firebase Storage is a separate service that needs to be manually enabled in the Firebase Console, even if you already have Authentication and Firestore working.

## Step-by-Step Fix

### 1. Enable Firebase Storage (REQUIRED)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `hockey-accountability`
3. In the left sidebar, click **Storage**
4. Click **Get started**
5. Choose **Start in test mode** (we'll secure it in step 2)
6. Select a storage location (preferably same region as your project)
7. Click **Done**

### 2. Apply Secure Storage Rules
Copy the contents of `storage.rules` to Firebase Console:

1. In Firebase Console > Storage > Rules tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Public workout images - readable by all, writable by no one
    match /workouts/public/{imageId} {
      allow read: if true;
      allow write: if false;
    }
    
    // User-specific workout images - users can upload/read their own images
    match /workouts/{userId}/{imageId} {
      allow read, write: if request.auth != null 
                         && request.auth.uid == userId
                         && request.resource.size < 10 * 1024 * 1024
                         && request.resource.contentType.matches('image/.*');
    }
    
    // Test folder for debugging
    match /test/{testFile} {
      allow read, write: if request.auth != null;
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

### 3. Upload Public Workout Images (Optional)
1. In Firebase Console > Storage
2. Create folder: `workouts/public/`
3. Upload 8 placeholder workout images named:
   - `ai_workout1.png`
   - `ai_workout2.png` 
   - `ai_workout3.png`
   - `ai_workout4.png`
   - `ai_workout5.png`
   - `ai_workout6.png`
   - `ai_workout7.png`
   - `ai_workout8.png`

### 4. Test the Fix
After enabling Storage, test the upload:

```bash
# Test storage access
node test_storage_setup.js

# Or test in the app by:
# 1. Open the app
# 2. Log a workout with an image
# 3. Check if "image uploaded successfully" appears in logs
```

## How It Works Now

### Security Structure
- **Public images**: `workouts/public/` - Everyone can read, no one can write
- **User images**: `workouts/<user_id>/` - Only the user can read/write their own images
- **File limits**: Max 10MB, images only
- **Authentication**: Required for all user uploads

### Image Flow
1. **AI Generated Images**: Uploaded to `workouts/<user_id>/ai_generated_<timestamp>.jpg`
2. **Manual Images**: Uploaded to `workouts/<user_id>/workout_<timestamp>.jpg`
3. **Fallback**: If user has no images, app uses public placeholder images
4. **Display**: App prioritizes user images, falls back to public images

### Code Structure
- `src/services/workoutImageService.js` - New unified image service
- `src/data/workoutImages.json` - Public image URLs and fallbacks
- `storage.rules` - Security rules for Firebase Console

## Expected Results After Fix

✅ **Users can upload workout images without errors**
✅ **Images are securely stored in user-specific folders**  
✅ **Public placeholder images work for users without uploads**
✅ **All storage operations follow security rules**
✅ **App store ready with production-level security**

## Troubleshooting

If you still get errors after enabling Storage:

1. **Check Storage Rules**: Make sure they're published correctly
2. **Verify User Auth**: User must be logged in to upload
3. **Check Image Size**: Must be under 10MB
4. **Test Connection**: Run `node test_storage_setup.js`
5. **Check Logs**: Look for detailed error messages in console

The main issue is simply that Firebase Storage needs to be enabled in your console. Once that's done, all the secure code is already in place!
