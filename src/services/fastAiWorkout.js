import OpenAI from 'openai';
import { generateWorkoutSecure, checkBackendHealth } from './backendApi';
import { autoUpdateRankingsAfterWorkout } from './ruleBasedRanking';

// Initialize OpenAI client (optimized for speed)
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

/**
 * OPTIMIZED: Fast AI workout generation with simplified prompts
 * This should reduce generation time from 20-40s to 5-15s
 */
export const generateWorkoutFast = async (preferences = {}, userRole = null) => {
  try {
    console.log('⚡ Generating FAST AI workout...');
    
    const {
      duration = '30',
      focus = userRole === 'group_member' ? 'general fitness' : 'hockey-specific',
      equipment = 'minimal',
      fitnessLevel = 'intermediate',
      customSpecifications = null
    } = preferences;

    // Role-appropriate simplified prompts for faster generation
    let prompt, systemContent;
    
    if (userRole === 'group_member') {
      // General fitness prompt for group members - NO HOCKEY REFERENCES
      prompt = `Create a ${duration}-minute general fitness workout for ${fitnessLevel} level with ${equipment} equipment. Focus on overall athletic performance and health. IMPORTANT: Do NOT mention hockey, ice, skating, or any hockey-related terms in the title or description. This is for general fitness only.`;
      systemContent = "You are a professional fitness trainer creating workouts for general fitness enthusiasts. Generate ONLY general fitness workouts with absolutely NO sport-specific references or mentions of hockey, ice sports, or skating. Return JSON only. Be concise.";
    } else {
      // Hockey-specific prompt for hockey players and coaches
      prompt = `Create a ${duration}-minute hockey training workout for ${fitnessLevel} level with ${equipment} equipment. Focus on hockey-specific skills and performance.`;
      systemContent = "You are a professional hockey trainer. Generate hockey-specific workouts as JSON only. Be concise.";
    }
    
    if (focus !== 'hockey-specific' && focus !== 'general fitness') {
      prompt += ` Focus: ${focus}.`;
    }
    
    if (customSpecifications) {
      prompt += ` Special requirements: ${customSpecifications}.`;
    }
    
    prompt += ` Return JSON only: {"title":"","description":"","warmup":[{"exercise":"","duration":"","description":""}],"mainWorkout":[{"exercise":"","sets":"","reps":"","description":""}],"cooldown":[{"exercise":"","duration":"","description":""}]}`;

    console.log('📝 Using optimized prompt length:', prompt.length);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Keep same model but optimize parameters
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800, // Reduced from 2000 for faster generation
      temperature: 0.5, // Reduced for more consistent, faster responses
    });

    console.log('✅ Fast AI generation complete');
    
    // Robust JSON parsing with cleaning
    let responseContent = completion.choices[0].message.content;
    console.log('🔍 Raw response content:', responseContent);
    
    try {
      // First try to find JSON within the response
      const jsonMatch = responseContent.match(/\{.*\}/s);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      
      let jsonString = jsonMatch[0];
      console.log('🔍 Extracted JSON string:', jsonString);
      
      // Clean up common JSON issues
      jsonString = jsonString
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/\]\]/g, ']')   // Fix double closing brackets
        .replace(/\}\}/g, '}')   // Fix double closing braces
        .replace(/\n/g, ' ')     // Remove newlines
        .replace(/\t/g, ' ')     // Remove tabs
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
      
      console.log('🧹 Cleaned JSON string:', jsonString);
      
      const workoutData = JSON.parse(jsonString);
      console.log('✅ JSON parsed successfully:', workoutData);

      // Add unique IDs to all exercises
      const workoutWithIds = addUniqueIds(workoutData);
      
      // Add required fields with defaults
      return {
        ...workoutWithIds,
        id: `workout_${Date.now()}`,
        difficulty: fitnessLevel,
        estimatedDuration: `${duration} minutes`,
        equipment: equipment === 'minimal' ? ['None required'] : [equipment],
        createdAt: new Date(),
        type: 'ai-generated'
      };
      
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.error('❌ Failed on content:', responseContent);
      throw new Error('Invalid JSON response from OpenAI: ' + parseError.message);
    }

  } catch (error) {
    console.error('⚡ Fast generation failed, using fallback:', error);
    return getFallbackWorkout(preferences);
  }
};

/**
 * Even faster: Template-based workout generation (1-3 seconds)
 * Uses predefined templates with AI-like variation
 */
export const generateWorkoutInstant = async (preferences = {}, userRole = null) => {
  console.log('🚀 Generating INSTANT workout...');
  
  const {
    duration = 30,
    focus = userRole === 'group_member' ? 'general fitness' : 'hockey-specific',
    fitnessLevel = 'intermediate'
  } = preferences;

  const durationNum = parseInt(duration) || 30;
  
  // Role-based template selection
  const templates = userRole === 'group_member' ? {
    'cardio': {
      title: 'Quick Cardio Blast',
      description: 'High-intensity cardio for improved endurance',
      warmup: [
        { exercise: 'Light jogging', duration: '3 minutes', description: 'Easy pace warm-up' },
        { exercise: 'Dynamic stretches', duration: '2 minutes', description: 'Leg swings, arm circles' }
      ],
      mainWorkout: [
        { exercise: 'Sprint intervals', sets: '6', reps: '30 seconds', description: 'All-out sprints with rest' },
        { exercise: 'Mountain climbers', sets: '3', reps: '45 seconds', description: 'Fast mountain climbers' },
        { exercise: 'Jump squats', sets: '3', reps: '15', description: 'Explosive squat jumps' }
      ],
      cooldown: [
        { exercise: 'Cool-down walk', duration: '3 minutes', description: 'Slow walking pace' },
        { exercise: 'Static stretches', duration: '5 minutes', description: 'Hold each stretch 30 seconds' }
      ]
    },
    'strength': {
      title: 'Strength Building Workout',
      description: 'Bodyweight strength training for overall fitness',
      warmup: [
        { exercise: 'Arm swings', duration: '2 minutes', description: 'Forward and backward arm circles' },
        { exercise: 'Bodyweight squats', duration: '3 minutes', description: 'Slow, controlled squats' }
      ],
      mainWorkout: [
        { exercise: 'Push-ups', sets: '3', reps: '12-15', description: 'Standard or modified push-ups' },
        { exercise: 'Lunges', sets: '3', reps: '12 each leg', description: 'Forward or reverse lunges' },
        { exercise: 'Plank hold', sets: '3', reps: '60 seconds', description: 'Hold strong plank position' }
      ],
      cooldown: [
        { exercise: 'Deep breathing', duration: '2 minutes', description: 'Slow, controlled breathing' },
        { exercise: 'Full body stretch', duration: '6 minutes', description: 'Stretch all major muscle groups' }
      ]
    },
    'default': {
      title: 'Complete Fitness Workout',
      description: 'Well-rounded workout combining strength and cardio',
      warmup: [
        { exercise: 'Dynamic warm-up', duration: '5 minutes', description: 'Light movement and dynamic stretches' }
      ],
      mainWorkout: [
        { exercise: 'Bodyweight squats', sets: '3', reps: '15', description: 'Squats for lower body strength' },
        { exercise: 'Push-ups', sets: '3', reps: '12', description: 'Upper body strength exercise' },
        { exercise: 'Plank hold', sets: '3', reps: '45 seconds', description: 'Core stability exercise' }
      ],
      cooldown: [
        { exercise: 'Flexibility flow', duration: `${Math.max(5, durationNum * 0.2)} minutes`, description: 'Full body stretching' }
      ]
    }
  } : {
    'cardio': {
      title: 'Hockey Cardio Blast',
      description: 'High-intensity cardio focused on hockey endurance',
      warmup: [
        { exercise: 'Light jogging', duration: '3 minutes', description: 'Easy pace warm-up' },
        { exercise: 'Dynamic stretches', duration: '2 minutes', description: 'Leg swings, arm circles' }
      ],
      mainWorkout: [
        { exercise: 'Sprint intervals', sets: '6', reps: '30 seconds', description: 'All-out sprints with rest' },
        { exercise: 'Mountain climbers', sets: '3', reps: '45 seconds', description: 'Fast mountain climbers' },
        { exercise: 'Jump squats', sets: '3', reps: '15', description: 'Explosive squat jumps' }
      ],
      cooldown: [
        { exercise: 'Cool-down walk', duration: '3 minutes', description: 'Slow walking pace' },
        { exercise: 'Static stretches', duration: '5 minutes', description: 'Hold each stretch 30 seconds' }
      ]
    },
    'strength': {
      title: 'Hockey Power Training',
      description: 'Strength building for powerful skating and shooting',
      warmup: [
        { exercise: 'Arm swings', duration: '2 minutes', description: 'Forward and backward arm circles' },
        { exercise: 'Bodyweight squats', duration: '3 minutes', description: 'Slow, controlled squats' }
      ],
      mainWorkout: [
        { exercise: 'Push-ups', sets: '3', reps: '12-15', description: 'Standard or modified push-ups' },
        { exercise: 'Single-leg squats', sets: '3', reps: '8 each leg', description: 'Pistol squats or assisted' },
        { exercise: 'Plank hold', sets: '3', reps: '60 seconds', description: 'Hold strong plank position' }
      ],
      cooldown: [
        { exercise: 'Deep breathing', duration: '2 minutes', description: 'Slow, controlled breathing' },
        { exercise: 'Full body stretch', duration: '6 minutes', description: 'Stretch all major muscle groups' }
      ]
    },
    'hockey-specific': {
      title: 'Complete Hockey Training',
      description: 'Well-rounded hockey workout combining skills and fitness',
      warmup: [
        { exercise: 'Hockey warm-up circuit', duration: '5 minutes', description: 'Light movement and dynamic stretches' }
      ],
      mainWorkout: [
        { exercise: 'Stick handling squats', sets: '3', reps: '15', description: 'Squats with imaginary stick handling' },
        { exercise: 'Shooting motion push-ups', sets: '3', reps: '12', description: 'Push-ups with explosive up motion' },
        { exercise: 'Skating stance hold', sets: '3', reps: '45 seconds', description: 'Hold low skating position' }
      ],
      cooldown: [
        { exercise: 'Hockey flexibility flow', duration: `${Math.max(5, durationNum * 0.2)} minutes`, description: 'Hip flexors, shoulders, ankles' }
      ]
    }
  };

  // Select template based on focus
  const selectedTemplate = templates[focus] || templates['hockey-specific'];
  
  // Adjust workout length based on duration
  const adjustedWorkout = adjustWorkoutDuration(selectedTemplate, durationNum);
  
  // Add unique IDs to all exercises
  const workoutWithIds = addUniqueIds(adjustedWorkout);
  
  return {
    ...workoutWithIds,
    id: `workout_${Date.now()}`,
    difficulty: fitnessLevel,
    estimatedDuration: `${durationNum} minutes`,
    equipment: ['None required'],
    createdAt: new Date(),
    type: 'ai-generated'
  };
};

/**
 * Adjust workout template based on desired duration
 */
const adjustWorkoutDuration = (template, targetDuration) => {
  const baseWorkout = JSON.parse(JSON.stringify(template)); // Deep copy
  
  if (targetDuration <= 15) {
    // Short workout: reduce sets and exercises
    baseWorkout.mainWorkout = baseWorkout.mainWorkout.slice(0, 2);
    baseWorkout.mainWorkout.forEach(exercise => {
      if (exercise.sets) exercise.sets = Math.max(1, parseInt(exercise.sets) - 1).toString();
    });
  } else if (targetDuration >= 60) {
    // Long workout: add exercises and sets
    baseWorkout.mainWorkout.forEach(exercise => {
      if (exercise.sets) exercise.sets = Math.min(5, parseInt(exercise.sets) + 1).toString();
    });
    // Add bonus exercise
    baseWorkout.mainWorkout.push({
      exercise: 'Bonus cardio burst',
      sets: '2',
      reps: '30 seconds',
      description: 'High-intensity movement of choice'
    });
  }
  
  return baseWorkout;
};

/**
 * Main generateWorkout function with speed options
 */
export const generateWorkout = async (preferences = {}) => {
  const { speed = 'fast' } = preferences;
  
  try {
    switch (speed) {
      case 'instant':
        return await generateWorkoutInstant(preferences);
      case 'fast':
        return await generateWorkoutFast(preferences);
      case 'detailed':
        // Fallback to original detailed generation
        const backendAvailable = await checkBackendHealth();
        if (backendAvailable) {
          return await generateWorkoutSecure(preferences);
        }
        return await generateWorkoutFast(preferences);
      default:
        return await generateWorkoutFast(preferences);
    }
  } catch (error) {
    console.error('All generation methods failed, using template:', error);
    return await generateWorkoutInstant(preferences);
  }
};

/**
 * Fallback workout (original fallback logic)
 */
const getFallbackWorkout = (preferences) => {
  const { duration = '30', fitnessLevel = 'intermediate' } = preferences;
  
  const fallbackWorkout = {
    title: "Hockey Essentials Workout",
    description: "Essential hockey training workout",
    difficulty: fitnessLevel,
    estimatedDuration: `${duration} minutes`,
    equipment: ["None required"],
    warmup: [
      {
        exercise: "Dynamic Warm-up",
        duration: "5 minutes",
        description: "Light jogging, dynamic stretches, movement prep"
      }
    ],
    mainWorkout: [
      {
        exercise: "Hockey Squats",
        sets: "3",
        reps: "15",
        description: "Deep squats mimicking skating position"
      },
      {
        exercise: "Push-up Variations",
        sets: "3", 
        reps: "12",
        description: "Build upper body strength for checking"
      },
      {
        exercise: "Core Circuit",
        sets: "3",
        reps: "45 seconds",
        description: "Plank, mountain climbers, Russian twists"
      }
    ],
    cooldown: [
      {
        exercise: "Cool Down Stretch",
        duration: "8 minutes",
        description: "Full body stretching routine"
      }
    ],
    id: `workout_${Date.now()}`,
    createdAt: new Date(),
    type: 'ai-generated'
  };
  
  // Add unique IDs to all exercises
  return addUniqueIds(fallbackWorkout);
};

/**
 * Add unique IDs to all exercises in a workout
 * @param {Object} workout - Workout object with warmup, mainWorkout, cooldown arrays
 * @returns {Object} Workout with unique exercise IDs
 */
const addUniqueIds = (workout) => {
  const timestamp = Date.now();
  let exerciseCounter = 0;
  
  const addIdsToSection = (exercises) => {
    return exercises.map(exercise => ({
      ...exercise,
      id: `${timestamp}_${exerciseCounter++}`,
      completed: false // Ensure all exercises start as incomplete
    }));
  };
  
  return {
    ...workout,
    warmup: addIdsToSection(workout.warmup || []),
    mainWorkout: addIdsToSection(workout.mainWorkout || []),
    cooldown: addIdsToSection(workout.cooldown || [])
  };
};

// Note: Original detailed AI workout function was removed to eliminate OpenAI dependency
