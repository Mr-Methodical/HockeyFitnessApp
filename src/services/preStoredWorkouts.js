import preStoredWorkoutsData from '../data/preStoredWorkouts.json';
import workoutImages from '../data/workoutImages.json';

/**
 * Add a random image to a workout
 */
const getWorkoutWithImage = (workout) => {
  const images = workoutImages.publicImages || workoutImages.fallbackImages || [];
  if (images.length === 0) {
    return { ...workout, image: null };
  }
  const randomIndex = Math.floor(Math.random() * images.length);
  return {
    ...workout,
    image: images[randomIndex]
  };
};

/**
 * Get workout suggestions based on user role
 * Now returns pre-stored workout categories with random images
 */
export const getWorkoutSuggestions = (userId, userRole = 'group_member') => {
  if (userRole === 'group_member') {
    const suggestions = [
      {
        title: 'Hockey Fan Fitness',
        description: 'Train like your favorite hockey team with high-energy workouts inspired by NHL training',
        focus: 'cardio endurance',
        duration: '30-45 minutes',
        category: 'hockey_fitness',
        theme: 'hockey',
        targetAudience: 'hockey_fans'
      },
      {
        title: 'Hockey Power Training',
        description: 'Build hockey-style strength and power like the pros - perfect for aspiring players',
        focus: 'strength training', 
        duration: '30-45 minutes',
        category: 'hockey_strength',
        theme: 'hockey',
        targetAudience: 'hockey_fans'
      },
      {
        title: 'Ice Rink Mobility',
        description: 'Graceful flexibility inspired by skating movements and hockey drills',
        focus: 'flexibility/mobility',
        duration: '15-20 minutes',
        category: 'hockey_mobility',
        theme: 'hockey',
        targetAudience: 'hockey_fans'
      }
    ];
    return suggestions.map(getWorkoutWithImage);
  } else {
    // For players and coaches
    const suggestions = [
      {
        title: 'Hockey Conditioning',
        description: 'High-intensity hockey-specific conditioning for competitive players',
        focus: 'hockey-specific',
        duration: '30-45 minutes',
        category: 'hockey_conditioning',
        theme: 'hockey',
        targetAudience: 'players'
      },
      {
        title: 'Hockey Strength Training',
        description: 'Functional strength for explosive hockey performance on the ice',
        focus: 'strength training',
        duration: '45-60 minutes', 
        category: 'strength_training',
        theme: 'hockey',
        targetAudience: 'players'
      },
      {
        title: 'Hockey Speed & Agility',
        description: 'Explosive speed and agility training for game-changing plays',
        focus: 'speed and agility',
        duration: '30-45 minutes',
        category: 'speed_agility',
        theme: 'hockey',
        targetAudience: 'players'
      }
    ];
    return suggestions.map(getWorkoutWithImage);
  }
};

/**
 * Get a random workout from a specific category
 */
export const getRandomWorkoutFromCategory = (category, userRole = 'group_member') => {
  const roleData = userRole === 'group_member' ? preStoredWorkoutsData.groupMember : preStoredWorkoutsData.player;
  const categoryWorkouts = roleData[category];
  
  if (!categoryWorkouts || categoryWorkouts.length === 0) {
    console.error(`No workouts found for category: ${category}, role: ${userRole}`);
    return null;
  }
  
  // Get random workout from the category
  const randomIndex = Math.floor(Math.random() * categoryWorkouts.length);
  const selectedWorkout = categoryWorkouts[randomIndex];
  
  // Add IDs and completion status to exercises
  const processedWorkout = {
    ...selectedWorkout,
    warmup: selectedWorkout.warmup?.map((exercise, index) => ({
      ...exercise,
      id: `warmup-${index}`,
      completed: false
    })) || [],
    mainWorkout: selectedWorkout.mainWorkout?.map((exercise, index) => ({
      ...exercise,
      id: `main-${index}`,
      completed: false
    })) || [],
    cooldown: selectedWorkout.cooldown?.map((exercise, index) => ({
      ...exercise,
      id: `cooldown-${index}`,
      completed: false
    })) || []
  };
  
  console.log(`✅ Selected random workout: ${processedWorkout.title} from ${category}`);
  return getWorkoutWithImage(processedWorkout);
};

/**
 * Generate instant workout - now just selects from pre-stored workouts
 */
export const generateWorkoutInstant = (preferences, userRole = 'group_member') => {
  console.log('🚀 Generating instant workout from pre-stored data...');
  
  // Determine category based on focus preference
  let category;
  const focus = preferences.focus || 'cardio endurance';
  
  if (userRole === 'group_member') {
    switch (focus) {
      case 'cardio endurance':
        category = 'hockey_fitness';
        break;
      case 'strength training':
        category = 'hockey_strength';
        break;
      case 'flexibility/mobility':
        category = 'hockey_mobility';
        break;
      default:
        category = 'hockey_fitness';
    }
  } else {
    // For players and coaches
    switch (focus) {
      case 'hockey-specific':
        category = 'hockey_conditioning';
        break;
      case 'strength training':
        category = 'strength_training';
        break;
      case 'speed and agility':
        category = 'speed_agility';
        break;
      default:
        category = 'hockey_conditioning';
    }
  }
  
  return getRandomWorkoutFromCategory(category, userRole);
};

/**
 * Generate workout from preferences - now selects appropriate pre-stored workout
 */
export const generatePreStoredWorkout = (preferences, userRole = 'group_member') => {
  console.log('⚡ Generating workout from pre-stored data with preferences:', preferences);
  
  // For now, treat this the same as instant generation
  // In the future, we could filter by duration, equipment, etc.
  return generateWorkoutInstant(preferences, userRole);
};

/**
 * Get all workouts for a specific category (for debugging/admin)
 */
export const getAllWorkoutsForCategory = (category, userRole = 'group_member') => {
  const roleData = userRole === 'group_member' ? preStoredWorkoutsData.groupMember : preStoredWorkoutsData.player;
  return roleData[category] || [];
};

/**
 * Get workout by ID
 */
export const getWorkoutById = (workoutId) => {
  // Search through all workouts to find by ID
  for (const role of ['player', 'groupMember']) {
    const roleData = preStoredWorkoutsData[role];
    for (const category in roleData) {
      const workout = roleData[category].find(w => w.id === workoutId);
      if (workout) {
        return getWorkoutWithImage(workout);
      }
    }
  }
  return null;
};

/**
 * Get available categories for a user role
 */
export const getAvailableCategories = (userRole = 'group_member') => {
  const roleData = userRole === 'group_member' ? preStoredWorkoutsData.groupMember : preStoredWorkoutsData.player;
  return Object.keys(roleData);
};