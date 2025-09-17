const OpenAI = require('openai');
require('dotenv').config({ path: './backend/.env' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Workout categories for players
const playerCategories = [
  {
    name: 'Hockey Conditioning',
    focus: 'hockey-specific',
    description: 'High-intensity hockey-specific conditioning workouts'
  },
  {
    name: 'Strength Training', 
    focus: 'strength training',
    description: 'Building functional strength for hockey performance'
  },
  {
    name: 'Speed & Agility',
    focus: 'speed and agility', 
    description: 'Explosive speed and agility training for hockey'
  }
];

// Workout categories for group members (hockey-themed)
const groupMemberCategories = [
  {
    name: 'Hockey Fitness',
    focus: 'cardio endurance',
    description: 'Hockey-inspired cardio and fitness workouts'
  },
  {
    name: 'Hockey Strength',
    focus: 'strength training',
    description: 'Hockey-inspired strength and conditioning'
  },
  {
    name: 'Hockey Mobility',
    focus: 'flexibility/mobility',
    description: 'Hockey-inspired flexibility and mobility training'
  }
];

const durations = ['15-20 minutes', '30-45 minutes', '45-60 minutes'];
const equipment = ['no equipment', 'minimal equipment', 'full gym access'];
const fitnessLevels = ['beginner', 'intermediate', 'advanced'];

async function generateWorkout(category, role, index) {
  const duration = durations[index % durations.length];
  const equipmentLevel = equipment[index % equipment.length];
  const fitnessLevel = fitnessLevels[Math.floor(index / 3) % fitnessLevels.length];
  
  const prompt = role === 'player' ? `
Create a detailed ${duration} ${category.focus} workout specifically designed for hockey players.

Requirements:
- Duration: ${duration}
- Equipment: ${equipmentLevel}
- Fitness Level: ${fitnessLevel}
- Focus: ${category.focus}

The workout should include:
1. Warm-up (3-4 exercises)
2. Main workout (6-8 exercises)  
3. Cool down (2-3 exercises)

Each exercise should have:
- Exercise name
- Description (2-3 sentences)
- Sets/reps or duration
- Rest periods
- Tips for proper form

Format as JSON with this structure:
{
  "title": "Workout Name",
  "description": "Brief description",
  "difficulty": "${fitnessLevel}",
  "estimatedDuration": "${duration}",
  "category": "${category.name}",
  "focus": "${category.focus}",
  "equipment": "${equipmentLevel}",
  "warmup": [
    {
      "exercise": "Exercise Name",
      "description": "How to perform",
      "duration": "time or sets x reps",
      "rest": "rest time",
      "tips": "form tips"
    }
  ],
  "mainWorkout": [
    {
      "exercise": "Exercise Name", 
      "description": "How to perform",
      "sets": "number",
      "reps": "reps or time",
      "rest": "rest time",
      "tips": "form tips"
    }
  ],
  "cooldown": [
    {
      "exercise": "Exercise Name",
      "description": "How to perform", 
      "duration": "time",
      "tips": "form tips"
    }
  ]
}
` : `
Create a detailed ${duration} ${category.focus} workout with hockey themes and terminology.

Requirements:
- Duration: ${duration}
- Equipment: ${equipmentLevel}
- Fitness Level: ${fitnessLevel}
- Focus: ${category.focus}
- Theme: Hockey-inspired but accessible to general fitness enthusiasts

The workout should include:
1. Warm-up (3-4 exercises)
2. Main workout (6-8 exercises)
3. Cool down (2-3 exercises)

Use hockey terminology and themes while keeping exercises accessible. Examples:
- "Power Play Push-ups" instead of "Push-ups"
- "Slapshot Squats" instead of "Squats"
- "Goalie Glute Bridges" instead of "Glute Bridges"

Each exercise should have:
- Exercise name (hockey-themed)
- Description (2-3 sentences)
- Sets/reps or duration
- Rest periods
- Tips for proper form

Format as JSON with this structure:
{
  "title": "Workout Name",
  "description": "Brief description",
  "difficulty": "${fitnessLevel}",
  "estimatedDuration": "${duration}",
  "category": "${category.name}",
  "focus": "${category.focus}",
  "equipment": "${equipmentLevel}",
  "warmup": [
    {
      "exercise": "Exercise Name",
      "description": "How to perform",
      "duration": "time or sets x reps",
      "rest": "rest time",
      "tips": "form tips"
    }
  ],
  "mainWorkout": [
    {
      "exercise": "Exercise Name",
      "description": "How to perform",
      "sets": "number", 
      "reps": "reps or time",
      "rest": "rest time",
      "tips": "form tips"
    }
  ],
  "cooldown": [
    {
      "exercise": "Exercise Name",
      "description": "How to perform",
      "duration": "time",
      "tips": "form tips"
    }
  ]
}
`;

  try {
    console.log(`Generating ${role} workout ${index + 1}/10 for ${category.name}...`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional fitness trainer specializing in hockey conditioning. Create detailed, safe, and effective workout plans. Always respond with valid JSON only."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content.trim();
    
    // Clean up the response to ensure it's valid JSON
    let cleanedContent = content;
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
    }
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    const workout = JSON.parse(cleanedContent);
    workout.id = `${role}_${category.name.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`;
    
    return workout;
  } catch (error) {
    console.error(`Error generating workout ${index + 1} for ${category.name}:`, error);
    return null;
  }
}

async function generateImagePrompt(workout) {
  const prompt = `Create a DALL-E image prompt for this workout: ${workout.title}

The workout is:
- ${workout.description}
- Focus: ${workout.focus}
- Equipment: ${workout.equipment}
- Duration: ${workout.estimatedDuration}

Create a prompt for a high-quality, motivational fitness image that represents this workout. The image should:
- Show people doing exercises related to the workout
- Be energetic and motivational
- Include relevant equipment if mentioned
- Be suitable for a fitness app
- Avoid text/words in the image

Keep the prompt under 400 characters and make it specific enough to generate a relevant image.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert at creating DALL-E image prompts. Create detailed, specific prompts that will generate high-quality fitness images."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error generating image prompt for ${workout.title}:`, error);
    return `High-energy fitness workout scene with people exercising, motivational atmosphere, professional gym setting`;
  }
}

async function generateAllWorkouts() {
  const allWorkouts = {
    player: {},
    groupMember: {}
  };

  console.log('🏒 Starting to generate 30 workout plans...\n');

  // Generate player workouts
  for (const category of playerCategories) {
    console.log(`\n🔥 Generating player workouts for ${category.name}...`);
    allWorkouts.player[category.name.toLowerCase().replace(/\s+/g, '_')] = [];
    
    for (let i = 0; i < 10; i++) {
      const workout = await generateWorkout(category, 'player', i);
      if (workout) {
        allWorkouts.player[category.name.toLowerCase().replace(/\s+/g, '_')].push(workout);
        console.log(`✅ Generated: ${workout.title}`);
      }
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate group member workouts  
  for (const category of groupMemberCategories) {
    console.log(`\n🏒 Generating group member workouts for ${category.name}...`);
    allWorkouts.groupMember[category.name.toLowerCase().replace(/\s+/g, '_')] = [];
    
    for (let i = 0; i < 10; i++) {
      const workout = await generateWorkout(category, 'group_member', i);
      if (workout) {
        allWorkouts.groupMember[category.name.toLowerCase().replace(/\s+/g, '_')].push(workout);
        console.log(`✅ Generated: ${workout.title}`);
      }
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate image prompts for all workouts
  console.log('\n🖼️ Generating image prompts for all workouts...');
  const imagePrompts = {};
  
  for (const role of ['player', 'groupMember']) {
    imagePrompts[role] = {};
    for (const categoryKey in allWorkouts[role]) {
      imagePrompts[role][categoryKey] = [];
      for (const workout of allWorkouts[role][categoryKey]) {
        const prompt = await generateImagePrompt(workout);
        imagePrompts[role][categoryKey].push({
          workoutId: workout.id,
          workoutTitle: workout.title,
          imagePrompt: prompt
        });
        console.log(`✅ Image prompt for: ${workout.title}`);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // Save workouts to file
  const fs = require('fs');
  fs.writeFileSync('./src/data/preStoredWorkouts.json', JSON.stringify(allWorkouts, null, 2));
  fs.writeFileSync('./src/data/workoutImagePrompts.json', JSON.stringify(imagePrompts, null, 2));
  
  console.log('\n🎉 All workouts and image prompts generated successfully!');
  console.log('📁 Saved to: ./src/data/preStoredWorkouts.json');
  console.log('📁 Image prompts saved to: ./src/data/workoutImagePrompts.json');
  
  // Print summary
  let totalWorkouts = 0;
  for (const role of ['player', 'groupMember']) {
    for (const categoryKey in allWorkouts[role]) {
      totalWorkouts += allWorkouts[role][categoryKey].length;
    }
  }
  console.log(`\n📊 Summary: Generated ${totalWorkouts} total workouts`);
  
  return { workouts: allWorkouts, imagePrompts };
}

// Run the generation
generateAllWorkouts().catch(console.error);