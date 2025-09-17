# Firebase Configuration Setup

## Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Follow the setup wizard

## Step 2: Enable Services
1. **Authentication**: 
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider

2. **Firestore Database**:
   - Go to Firestore Database
   - Create database in test mode
   - Choose your preferred location

3. **Storage**:
   - Go to Storage
   - Get started with default rules

## Step 3: Get Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" > Web app icon
4. Register your app
5. Copy the config object

## Step 4: Update Firebase Config
Replace the placeholder values in `src/services/firebase.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "AIza...", // Your actual API key
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## Security Rules (Important!)

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'coach';
    }
    
    match /workouts/{workoutId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // All workout images (regular workouts and AI workouts) use this path
    match /workouts/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
