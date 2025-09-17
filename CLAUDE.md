# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native Expo application called "Hockey Accountability App" that enables hockey teams to track workouts and maintain team accountability. The app features role-based authentication (coaches and players), workout logging with image capture, team leaderboards, and real-time messaging.

## Architecture

### Frontend (React Native + Expo)
- **Main App**: Built with Expo SDK ~53.0.20 and React Native 0.79.5
- **Navigation**: React Navigation with stack and tab navigators
- **State Management**: React Context API for authentication and theme management
- **UI Components**: Custom components with StyleSheet-based styling

### Backend Services
- **Primary Backend**: Firebase (Authentication, Firestore, Storage)
- **API Server**: Express.js server (`backend/server.js`) for OpenAI integration
- **AI Features**: OpenAI GPT integration for workout generation and image analysis

### Key Services Architecture
- `src/services/firebase.js` - Firebase configuration with environment variable validation
- `src/services/auth.js` - Authentication services
- `src/services/team.js` - Team management and workout operations
- `src/utils/AuthContext.js` - Authentication state management with offline handling

## Development Commands

### Frontend (Main App)
```bash
npm start           # Start Expo development server
npm run ios         # Run on iOS simulator  
npm run android     # Run on Android emulator
npm run web         # Run in web browser
```

### Backend API Server
```bash
cd backend
npm start           # Start production server
npm run dev         # Start with nodemon for development
```

## Environment Configuration

### Frontend Environment (.env)
Required Firebase configuration variables:
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

### Backend Environment (backend/.env)
```
OPENAI_API_KEY=
PORT=3001
ALLOWED_ORIGINS=
```

## Firebase Collections Schema

### users
```javascript
{
  email: string,
  name: string,
  role: 'coach' | 'player' | 'group_member',
  teamId: string | null,
  createdAt: timestamp,
  // Additional fields for streaks, badges, themes
}
```

### teams  
```javascript
{
  name: string,
  code: string,
  coachId: string,
  createdAt: timestamp
}
```

### workouts
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

## Navigation Structure

### Authenticated Users
- **Coaches**: `CoachDashboard` (single screen)
- **Players**: `PlayerTabNavigator` with tabs for Dashboard, AI Workouts, Challenges, Badges

### Shared Screens
All authenticated users can access:
- `LogWorkoutScreen`, `LeaderboardScreen`, `WorkoutDetailScreen`
- `MessagesScreen`, `ChatScreen`, `TeamSettingsScreen`
- `WorkoutHistoryScreen`, `BadgesScreen`

## Key Development Patterns

### Authentication Flow
```javascript
// Use the useAuth hook for authentication state
const { user, userProfile, isCoach, isPlayer, isAuthenticated } = useAuth();
```

### Firebase Operations
```javascript
// Services follow modular Firebase v9 patterns
import { auth, db, storage } from '../services/firebase';
import { collection, addDoc, query, where } from 'firebase/firestore';
```

### Error Handling
The app includes comprehensive error handling for:
- Offline/connection issues with retry logic
- Firebase internal assertion errors (suppressed in development)
- Authentication state persistence with AsyncStorage

### Styling Approach
- Use StyleSheet for component styling
- Theme management through ThemeContext
- Support for custom themes and dark mode

## Special Features

### AI Integration
- OpenAI GPT-4 for workout plan generation (`src/services/aiWorkout.js`)
- Image analysis for workout verification
- Rate-limited API endpoints (5 requests/minute)

### Offline Support
- Firestore offline persistence enabled
- Connection monitoring with `useFirestoreConnection`
- Retry mechanisms for failed operations

### Performance Optimizations
- Image optimization and lazy loading
- Skeleton loaders for better UX
- Background processing for AI operations

## Testing & Deployment

### Firebase Security Rules
Firestore and Storage security rules are documented in `firebase-security-rules.txt` and the README.

### Build Configuration
- EAS Build configuration in `eas.json`
- App configuration in `app.json` with platform-specific settings
- Bundle identifier: `com.ryanhowe07.hockeyaccountabilityapp`