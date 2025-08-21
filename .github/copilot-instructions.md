<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Hockey Accountability App - React Native Expo

This is a React Native Expo application for hockey team accountability, built with Firebase for backend services.

## Project Structure
- `/src/screens/` - All React Native screens
- `/src/components/` - Reusable React components
- `/src/services/` - Firebase services (auth, firestore, storage)
- `/src/navigation/` - React Navigation setup
- `/src/utils/` - Utility functions and context providers

## Key Technologies
- React Native with Expo
- Firebase (Authentication, Firestore, Storage)
- React Navigation
- @expo/vector-icons for icons

## App Features
- Coach and Player roles
- Team creation and joining via codes
- Workout logging with optional images
- Leaderboard and stats tracking
- Firebase Authentication with email/password

## Development Guidelines
- Use functional components with hooks
- Follow Firebase v9+ modular SDK patterns
- Use StyleSheet for component styling
- Implement proper error handling and loading states
- Use TypeScript for type safety where possible

## Firebase Collections Structure
- `users`: User profiles with role and team information
- `teams`: Team data with codes and coach information  
- `workouts`: Individual workout logs with user and team references

## Common Patterns
- Use `useAuth()` hook to access authentication state
- Implement loading and error states for async operations
- Use React Navigation for screen transitions
- Follow React Native best practices for performance
