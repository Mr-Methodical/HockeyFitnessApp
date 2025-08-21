# User Flows and API Methods - Hockey Accountability App

## 1. Authentication Flow

### User Registration
```
1. User enters email/password on SignupScreen
2. Call auth.createUserWithEmailAndPassword()
3. On success, create user profile in Firestore
4. Navigate to role selection or team joining
```

**API Methods:**
```javascript
// src/services/auth.js
export const signUp = async (email, password, userData) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const userId = userCredential.user.uid;
  
  // Create user profile in Firestore
  await userService.createUser(userId, {
    email,
    ...userData,
    createdAt: serverTimestamp()
  });
  
  return userCredential.user;
};
```

### User Login
```
1. User enters credentials on LoginScreen
2. Call auth.signInWithEmailAndPassword()
3. Load user profile from Firestore
4. Navigate to appropriate dashboard (Coach/Player)
```

**API Methods:**
```javascript
export const signIn = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};
```

## 2. Team Management Flow

### Coach Creates Team
```
1. Coach selects "Create Team" option
2. Enters team name and settings
3. System generates unique 6-character team code
4. Team document created in Firestore
5. Coach added as team member with "coach" role
6. Display team code to coach for sharing
```

**API Methods:**
```javascript
// src/services/team.js
export const createTeam = async (coachId, teamData) => {
  const teamCode = generateUniqueTeamCode();
  
  const team = await teamService.createTeam({
    ...teamData,
    coachId,
    code: teamCode,
    createdAt: serverTimestamp()
  });
  
  return team;
};
```

### Player Joins Team
```
1. Player enters team code on JoinTeamScreen
2. System validates code and finds team
3. Check if team exists and is active
4. Add player to team members subcollection
5. Update player's teamId in user profile
6. Navigate to player dashboard
```

**API Methods:**
```javascript
export const joinTeam = async (userId, teamCode) => {
  const team = await teamService.getTeamByCode(teamCode);
  
  if (!team) {
    throw new Error('Invalid team code');
  }
  
  await teamService.joinTeam(team.id, userId);
  return team;
};
```

## 3. Workout Logging Flow

### Player Logs Workout
```
1. Player navigates to LogWorkoutScreen
2. Fills out workout details:
   - Description/type
   - Duration
   - Optional image upload
3. Submit workout data
4. Save to Firestore with teamId and userId
5. Upload image to Storage (if provided)
6. Update workout document with image URL
7. Navigate back to dashboard with success message
```

**API Methods:**
```javascript
// src/services/workouts.js
export const createWorkout = async (userId, teamId, workoutData, imageUri) => {
  let imageUrl = null;
  
  // Upload image if provided
  if (imageUri) {
    imageUrl = await uploadWorkoutImage(userId, imageUri);
  }
  
  const workout = await workoutService.createWorkout({
    ...workoutData,
    userId,
    teamId,
    imageUrl,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp()
  });
  
  return workout;
};
```

### AI Workout Generation
```
1. Player opens AI Workout Screen
2. Selects preferences (duration, focus, equipment, fitness level)
3. Optionally adds custom specifications
4. AI generates personalized workout
5. Player completes exercises (mark as done)
6. Progress tracked in real-time
7. Complete workout and save session
```

**API Methods:**
```javascript
// src/services/aiWorkout.js
export const generateWorkout = async (preferences) => {
  const prompt = buildWorkoutPrompt(preferences);
  const response = await openAI.createCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500
  });
  
  return parseWorkoutResponse(response.data.choices[0].message.content);
};

export const saveAIWorkout = async (userId, workout, duration, teamId, imageUri) => {
  return createWorkout(userId, teamId, {
    type: 'ai-generated',
    title: workout.title,
    description: workout.description,
    duration,
    exercises: workout.exercises,
    difficulty: workout.difficulty
  }, imageUri);
};
```

## 4. Dashboard Views

### Coach Dashboard
```
1. Display team overview:
   - Team name and code
   - Member count
   - Recent activity
2. Show team workout leaderboard
3. Display recent workouts from all team members
4. Access to team management features
```

**API Methods:**
```javascript
// Real-time team workouts
export const useTeamWorkouts = (teamId) => {
  const [workouts, setWorkouts] = useState([]);
  
  useEffect(() => {
    const unsubscribe = workoutService.subscribeToTeamWorkouts(
      teamId, 
      (workoutData) => setWorkouts(workoutData)
    );
    
    return unsubscribe;
  }, [teamId]);
  
  return workouts;
};
```

### Player Dashboard
```
1. Display personal workout history
2. Show team leaderboard position
3. Display upcoming or suggested workouts
4. Quick access to log workout or AI workout
```

**API Methods:**
```javascript
// Personal workout history
export const useUserWorkouts = (userId) => {
  const [workouts, setWorkouts] = useState([]);
  
  useEffect(() => {
    const unsubscribe = workoutService.subscribeToUserWorkouts(
      userId,
      (workoutData) => setWorkouts(workoutData)
    );
    
    return unsubscribe;
  }, [userId]);
  
  return workouts;
};
```

## 5. Image Upload Flow

### Profile Image Upload
```
1. User selects "Change Profile Photo"
2. Choose between camera or gallery
3. Image picker opens
4. User selects/takes photo
5. Image uploaded to Storage: /profile-images/{userId}/
6. Get download URL
7. Update user profile with imageUrl
```

**API Methods:**
```javascript
// src/services/storage.js
export const uploadProfileImage = async (userId, imageUri) => {
  const fileName = `profile_${Date.now()}.jpg`;
  const storageRef = ref(storage, `profile-images/${userId}/${fileName}`);
  
  const response = await fetch(imageUri);
  const blob = await response.blob();
  
  const uploadTask = uploadBytes(storageRef, blob);
  const snapshot = await uploadTask;
  
  return getDownloadURL(snapshot.ref);
};
```

### Workout Image Upload
```
1. During workout logging, user adds image
2. Choose between camera, gallery, or AI-generated
3. If AI-generated, skip upload and use placeholder
4. Upload to Storage: /workout-images/{userId}/
5. Get download URL and save with workout
```

**API Methods:**
```javascript
export const uploadWorkoutImage = async (userId, imageUri) => {
  if (imageUri === 'ai-generated') {
    return 'ai-generated'; // Placeholder for AI images
  }
  
  const fileName = `workout_${Date.now()}.jpg`;
  const storageRef = ref(storage, `workout-images/${userId}/${fileName}`);
  
  const response = await fetch(imageUri);
  const blob = await response.blob();
  
  const uploadTask = uploadBytes(storageRef, blob);
  const snapshot = await uploadTask;
  
  return getDownloadURL(snapshot.ref);
};
```

## 6. Real-time Updates

### Team Activity Feed
```
1. Subscribe to team workouts collection
2. Listen for new workout documents
3. Update UI in real-time when teammates log workouts
4. Show live leaderboard updates
```

**Implementation:**
```javascript
// Real-time team activity
export const useTeamActivity = (teamId) => {
  const [activities, setActivities] = useState([]);
  
  useEffect(() => {
    if (!teamId) return;
    
    const q = query(
      collection(db, 'workouts'),
      where('teamId', '==', teamId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newActivities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(newActivities);
    });
    
    return unsubscribe;
  }, [teamId]);
  
  return activities;
};
```

## 7. Error Handling Patterns

### Network Error Recovery
```javascript
// Automatic retry with exponential backoff
export const withRetry = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

### Offline Support
```javascript
// Handle offline states
export const useOfflineSupport = () => {
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return unsubscribe;
  }, []);
  
  return isOffline;
};
```

## 8. Performance Optimizations

### Lazy Loading
```javascript
// Paginated workout loading
export const usePaginatedWorkouts = (teamId) => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    // Implementation for loading next page
  }, [loading, hasMore]);
  
  return { workouts, loading, hasMore, loadMore };
};
```

### Image Caching
```javascript
// Image optimization and caching
export const optimizeImage = (imageUri, size = 'medium') => {
  const sizes = {
    thumbnail: '100x100',
    medium: '400x400',
    large: '800x800'
  };
  
  if (imageUri.includes('firebasestorage')) {
    return `${imageUri}_${sizes[size]}`;
  }
  
  return imageUri;
};
```

## 9. Security Considerations

### Data Validation
```javascript
// Client-side validation before Firestore operations
export const validateWorkoutData = (workoutData) => {
  const required = ['description', 'duration', 'userId', 'teamId'];
  const missing = required.filter(field => !workoutData[field]);
  
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (workoutData.duration <= 0 || workoutData.duration > 1440) {
    throw new ValidationError('Duration must be between 1 and 1440 minutes');
  }
  
  return true;
};
```

### Authentication State Management
```javascript
// Persistent auth state with security checks
export const useAuthState = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Verify user still exists in Firestore
        const userProfile = await userService.getUser(firebaseUser.uid);
        setUser({ ...firebaseUser, profile: userProfile });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  return { user, loading };
};
```
