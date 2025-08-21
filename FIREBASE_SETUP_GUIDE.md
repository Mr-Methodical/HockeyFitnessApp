# Firebase Console Setup Guide for Hockey Accountability App

## 1. Firebase Project Setup

### Create Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name: "Hockey Accountability App" (or your preferred name)
4. Enable Google Analytics (optional but recommended)
5. Complete project creation

### Add App
1. Click "Add app" → Web (</>) icon
2. App nickname: "Hockey Accountability App"
3. Check "Set up Firebase Hosting" (optional)
4. Copy the config object and add to your .env file

## 2. Authentication Setup

### Enable Email/Password Authentication
1. Go to Authentication → Sign-in method
2. Click "Email/Password"
3. Enable both options:
   - Email/Password: Enabled
   - Email link (passwordless sign-in): Enabled (optional)
4. Save

### Configure Settings
1. Go to Authentication → Settings
2. User actions → Email enumeration protection: Enable
3. Authorized domains: Add your domains (localhost for development)

## 3. Firestore Database Setup

### Create Database
1. Go to Firestore Database
2. Click "Create database"
3. Start in "test mode" (we'll add security rules later)
4. Choose location closest to your users
5. Done

### Required Composite Indexes
Run these commands in Firebase CLI or add in Console:

```bash
# Team workouts ordered by timestamp
firebase firestore:indexes

# Add to firestore.indexes.json:
{
  "indexes": [
    {
      "collectionGroup": "workouts",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "teamId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "workouts",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "workouts",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "teamId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### Manual Index Creation (Alternative)
If you prefer to create indexes manually in the console:

1. Go to Firestore → Indexes → Composite
2. Create these indexes:

**Index 1: Team Workouts by Creation Date**
- Collection: workouts
- Fields:
  - teamId (Ascending)
  - createdAt (Descending)
- Query scope: Collection

**Index 2: User Workouts by Creation Date**
- Collection: workouts
- Fields:
  - userId (Ascending)
  - createdAt (Descending)
- Query scope: Collection

**Index 3: Team Workouts by Timestamp**
- Collection: workouts
- Fields:
  - teamId (Ascending)
  - timestamp (Descending)
- Query scope: Collection

## 4. Firebase Storage Setup

### Enable Storage
1. Go to Storage
2. Click "Get started"
3. Start in "test mode" (we'll add security rules later)
4. Choose same location as Firestore
5. Done

### Create Storage Structure
Create these folders in Storage:
```
/profile-images/{userId}/
/workout-images/{userId}/
/ai-images/
```

## 5. Security Rules Implementation

### Firestore Rules
1. Go to Firestore → Rules
2. Replace default rules with the content from `firebase-security-rules.txt`
3. Publish rules

### Storage Rules
1. Go to Storage → Rules
2. Replace default rules with the storage rules from `firebase-security-rules.txt`
3. Publish rules

## 6. Environment Variables Setup

Create `.env` file in your project root:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key-here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 7. Testing & Validation

### Test Authentication
1. Create a test user account
2. Verify user document is created in Firestore
3. Test sign out and sign in

### Test Firestore
1. Create a test team
2. Join team with another user
3. Create workout entries
4. Verify data appears correctly

### Test Storage
1. Upload a profile image
2. Upload a workout image
3. Verify images are accessible

## 8. Production Considerations

### Security Rules Review
- Review and tighten security rules before production
- Consider adding rate limiting
- Add validation rules for data structure

### Performance Optimization
- Enable offline persistence
- Configure appropriate cache settings
- Monitor quota usage

### Monitoring Setup
1. Go to Analytics (if enabled)
2. Set up custom events for key actions:
   - workout_created
   - team_joined
   - user_registration

### Backup Strategy
1. Set up automated Firestore backups
2. Configure retention policies
3. Test restore procedures

## 9. Optional Enhancements

### Cloud Functions (if needed)
1. Enable Cloud Functions
2. Set up functions for:
   - User creation triggers
   - Image processing
   - Data validation
   - Notifications

### Firebase Extensions
Consider these useful extensions:
- Resize Images
- Delete User Data
- Send Email with Nodemailer

## 10. Development vs Production

### Development
- Use test data
- Relaxed security rules
- Local emulator for testing

### Production
- Strict security rules
- Enable audit logging
- Monitor performance
- Set up alerts

## Common Issues & Solutions

### Index Creation Errors
- Indexes can take time to build
- Check Firestore → Indexes for status
- Single-field indexes are auto-created

### Storage Upload Errors
- Check CORS configuration
- Verify file size limits
- Ensure proper file types

### Authentication Issues
- Verify authorized domains
- Check API key restrictions
- Review user management settings

## Firebase CLI Commands

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init

# Deploy security rules
firebase deploy --only firestore:rules,storage

# Deploy indexes
firebase deploy --only firestore:indexes

# Start local emulators
firebase emulators:start
```
