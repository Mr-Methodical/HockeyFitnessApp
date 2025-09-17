# Hockey Accountability App

A React Native Expo application for hockey team accountability, featuring coach and player dashboards, workout logging, and team leaderboards.

## 🚀 Getting Started

### Prerequisites

- Node.js (14 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project with Firestore and Authentication enabled

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hockey-accountability-app.git
   cd hockey-accountability-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Configuration**
   - Copy `.env.example` to `.env`
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing project
   - Go to Project Settings > General
   - Copy your Firebase config values into the `.env` file

4. **Start the development server**
   ```bash
   npx expo start
   ```

## Features

### 🏒 For Coaches
- Create and manage teams
- View all player workout logs
- Track team statistics and progress
- Generate team codes for player invitations

### 👥 For Players
- Join teams using team codes
- Log workouts with photos and details
- View team leaderboards
- Track personal workout statistics

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Navigation**: React Navigation
- **State Management**: React Context API

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Firebase project

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Configuration
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password
3. Create a Firestore database
4. Enable Storage for workout images
5. Copy your Firebase config and update `src/services/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 3. Firestore Security Rules
Set up the following Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Team members can read team data
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'coach';
    }
    
    // Team members can read workouts, users can create their own
    match /workouts/{workoutId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

### 4. Storage Security Rules
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

## Running the App

### Development
```bash
npm start
```

This will start the Expo development server. You can then:
- Press `i` to run on iOS simulator
- Press `a` to run on Android emulator
- Press `w` to run in web browser
- Scan the QR code with the Expo Go app on your phone

### Platform-specific Commands
```bash
npm run ios     # Run on iOS
npm run android # Run on Android
npm run web     # Run in browser
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # Navigation setup
│   └── RootNavigator.js
├── screens/            # App screens
│   ├── LoginScreen.js
│   ├── SignupScreen.js
│   ├── CoachDashboard.js
│   └── PlayerDashboard.js
├── services/           # Firebase services
│   ├── firebase.js     # Firebase config
│   ├── auth.js        # Authentication services
│   └── team.js        # Team and workout services
└── utils/             # Utilities and context
    └── AuthContext.js # Authentication context
```

## Database Schema

### Collections

#### `users`
```javascript
{
  email: string,
  name: string,
  role: 'coach' | 'player',
  teamId: string | null,
  createdAt: timestamp
}
```

#### `teams`
```javascript
{
  name: string,
  code: string,
  coachId: string,
  createdAt: timestamp
}
```

#### `workouts`
```javascript
{
  userId: string,
  teamId: string,
  type: string,
  duration: number,
  notes: string,
  imageUrl: string | null,
  timestamp: timestamp,
  createdAt: timestamp
}
```

## Next Steps

### Planned Features
- [ ] Log Workout screen with image capture
- [ ] Leaderboard screen with sorting options
- [ ] Push notifications for team updates
- [ ] Workout type categories and templates
- [ ] Monthly/weekly challenges
- [ ] Export workout data

### Additional Screens to Implement
- `LogWorkoutScreen.js` - Form for logging new workouts
- `LeaderboardScreen.js` - Team ranking and statistics
- `ProfileScreen.js` - User profile management
- `TeamManagementScreen.js` - Coach team management tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
