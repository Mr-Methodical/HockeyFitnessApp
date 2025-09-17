import OpenAI from 'openai';
import { autoUpdateRankingsAfterWorkout } from './ruleBasedRanking';

// Initialize OpenAI client for group member workouts
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

/**
 * FAST AI workout generation for GROUP MEMBERS ONLY
 * Completely general fitness - NO hockey references
 */
export const generateGroupMemberWorkout = async (preferences = {}) => {
  try {
    console.log('⚡ Generating FAST group member workout...');
    
    const {
      duration = '30',
      focus = 'general fitness',
      equipment = 'minimal',
      fitnessLevel = 'intermediate',
      customSpecifications = null
    } = preferences;

    // General fitness prompt - NO HOCKEY MENTIONS
    const prompt = `Create a ${duration}-minute general fitness workout for ${fitnessLevel} level with ${equipment} equipment. Focus: ${focus}.`;
    
    const systemContent = "You are a professional fitness trainer for general fitness enthusiasts. Create workouts focused on overall health, strength, cardio, and flexibility. IMPORTANT: Do NOT mention hockey, ice skating, sports equipment, or any sport-specific training. Keep it general fitness only.";
    
    let fullPrompt = prompt;
    if (customSpecifications) {
      fullPrompt += ` Special requirements: ${customSpecifications}.`;
    }
    
    fullPrompt += ` Return JSON only: {"title":"General fitness workout name (NO sports references)","description":"Brief description of fitness benefits","warmup":[{"exercise":"","duration":"","description":""}],"mainWorkout":[{"exercise":"","sets":"","reps":"","description":""}],"cooldown":[{"exercise":"","duration":"","description":""}]}`;

    console.log('📝 Group member prompt:', fullPrompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: fullPrompt
        }
      ],
      max_tokens: 800,
      temperature: 0.5,
    });

    console.log('✅ Group member workout generation complete');
    
    // Parse JSON response
    let responseContent = completion.choices[0].message.content;
    console.log('🔍 Raw response:', responseContent);
    
    try {
      const jsonMatch = responseContent.match(/\{.*\}/s);
      
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }
      
      let jsonString = jsonMatch[0];
      
      // Clean up JSON
      jsonString = jsonString
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/\]\]/g, ']')
        .replace(/\}\}/g, '}')
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      const workoutData = JSON.parse(jsonString);
      console.log('✅ Group member workout parsed:', workoutData);

      // Ensure proper structure
      const formattedWorkout = {
        title: workoutData.title || `${duration}-Minute Fitness Workout`,
        description: workoutData.description || 'Complete fitness workout for overall health',
        estimatedDuration: `${parseInt(duration) || 30} minutes`,
        difficulty: fitnessLevel,
        equipment: equipment,
        warmup: Array.isArray(workoutData.warmup) ? workoutData.warmup : [
          { exercise: 'Dynamic warm-up', duration: '5 minutes', description: 'Light movement preparation' }
        ],
        mainWorkout: Array.isArray(workoutData.mainWorkout) ? workoutData.mainWorkout : [
          { exercise: 'Bodyweight exercises', sets: '3', reps: '12-15', description: 'Strength and cardio combination' }
        ],
        cooldown: Array.isArray(workoutData.cooldown) ? workoutData.cooldown : [
          { exercise: 'Stretching', duration: '5 minutes', description: 'Full body flexibility' }
        ]
      };

      return formattedWorkout;

    } catch (parseError) {
      console.error('🔍 JSON parsing failed:', parseError);
      return getInstantGroupWorkout(preferences);
    }

  } catch (error) {
    console.error('❌ Group member workout generation failed:', error);
    return getInstantGroupWorkout(preferences);
  }
};

/**
 * INSTANT workout templates for group members - NO hockey references
 */
export const generateGroupMemberWorkoutInstant = async (preferences = {}) => {
  console.log('🚀 Generating INSTANT group member workout...');
  
  const {
    duration = 30,
    focus = 'general fitness',
    fitnessLevel = 'intermediate'
  } = preferences;

  const durationNum = parseInt(duration) || 30;
  
  // General fitness templates - NO HOCKEY
  const templates = {
    'cardio': {
      title: 'Cardio Endurance Blast',
      description: 'High-intensity cardio for improved cardiovascular health',
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
      description: 'Bodyweight strength training for muscle development',
      warmup: [
        { exercise: 'Arm circles', duration: '2 minutes', description: 'Forward and backward arm circles' },
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
    'flexibility': {
      title: 'Flexibility and Mobility',
      description: 'Improve range of motion and reduce muscle tension',
      warmup: [
        { exercise: 'Gentle movement', duration: '3 minutes', description: 'Light walking and arm swings' },
        { exercise: 'Joint circles', duration: '2 minutes', description: 'Ankle, knee, hip, shoulder circles' }
      ],
      mainWorkout: [
        { exercise: 'Yoga flow', sets: '3', reps: '10 breaths', description: 'Sun salutation sequence' },
        { exercise: 'Deep stretches', sets: '1', reps: '60 seconds each', description: 'Hold major muscle group stretches' },
        { exercise: 'Foam rolling', sets: '1', reps: '5 minutes', description: 'Self-massage for muscle release' }
      ],
      cooldown: [
        { exercise: 'Meditation', duration: '5 minutes', description: 'Mindful breathing and relaxation' },
        { exercise: 'Gentle stretching', duration: '5 minutes', description: 'Light stretches to finish' }
      ]
    },
    'default': {
      title: 'Complete Fitness Workout',
      description: 'Well-rounded workout combining strength, cardio, and flexibility',
      warmup: [
        { exercise: 'Dynamic warm-up', duration: '5 minutes', description: 'Light movement and dynamic stretches' }
      ],
      mainWorkout: [
        { exercise: 'Bodyweight squats', sets: '3', reps: '15', description: 'Lower body strength' },
        { exercise: 'Push-ups', sets: '3', reps: '12', description: 'Upper body strength' },
        { exercise: 'Plank hold', sets: '3', reps: '45 seconds', description: 'Core stability' },
        { exercise: 'Jumping jacks', sets: '3', reps: '30 seconds', description: 'Cardio burst' }
      ],
      cooldown: [
        { exercise: 'Cool-down stretching', duration: `${Math.max(5, durationNum * 0.2)} minutes`, description: 'Full body flexibility' }
      ]
    }
  };

  // Select template based on focus
  const selectedTemplate = templates[focus] || templates['default'];
  
  // Adjust workout length based on duration
  const adjustedWorkout = adjustWorkoutDuration(selectedTemplate, durationNum);
  
  console.log('✅ Instant group member workout generated');
  return adjustedWorkout;
};

/**
 * Fallback workout for group members when generation fails
 */
const getInstantGroupWorkout = (preferences = {}) => {
  console.log('🔄 Using fallback group member workout...');
  
  const { duration = 30, fitnessLevel = 'intermediate' } = preferences;
  const durationNum = parseInt(duration) || 30;
  
  return {
    title: 'Complete Fitness Training',
    description: 'Well-rounded workout for overall health and fitness',
    estimatedDuration: `${durationNum} minutes`,
    difficulty: fitnessLevel,
    equipment: 'bodyweight',
    warmup: [
      { exercise: 'Dynamic warm-up', duration: '5 minutes', description: 'Prepare your body for exercise' }
    ],
    mainWorkout: [
      { exercise: 'Bodyweight circuit', sets: '3', reps: '45 seconds each', description: 'Squats, push-ups, lunges, planks' },
      { exercise: 'Cardio intervals', sets: '4', reps: '30 seconds', description: 'High-intensity movement' }
    ],
    cooldown: [
      { exercise: 'Stretching routine', duration: '8 minutes', description: 'Full body flexibility work' }
    ]
  };
};

/**
 * Adjust workout duration by scaling exercises
 */
const adjustWorkoutDuration = (template, targetDuration) => {
  const baseDuration = 30; // Base template duration
  const scale = targetDuration / baseDuration;
  
  // Clone template to avoid mutation
  const adjusted = JSON.parse(JSON.stringify(template));
  
  // Adjust durations proportionally
  adjusted.warmup = adjusted.warmup.map(exercise => ({
    ...exercise,
    duration: exercise.duration ? scaleDuration(exercise.duration, scale) : exercise.duration
  }));
  
  adjusted.cooldown = adjusted.cooldown.map(exercise => ({
    ...exercise,
    duration: exercise.duration ? scaleDuration(exercise.duration, scale) : exercise.duration
  }));
  
  adjusted.estimatedDuration = `${targetDuration} minutes`;
  
  return adjusted;
};

/**
 * Scale duration strings proportionally
 */
const scaleDuration = (duration, scale) => {
  const match = duration.match(/(\d+)/);
  if (match) {
    const originalMinutes = parseInt(match[1]);
    const newMinutes = Math.max(1, Math.round(originalMinutes * scale));
    return duration.replace(/\d+/, newMinutes.toString());
  }
  return duration;
};
