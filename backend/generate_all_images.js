const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Read the complete workout data
const workoutData = JSON.parse(fs.readFileSync('../src/data/preStoredWorkouts.json', 'utf8'));

// Read existing images to avoid duplicates
const existingImages = JSON.parse(fs.readFileSync('../src/data/workoutImages.json', 'utf8'));

// Create a set of existing workout IDs
const existingImageIds = new Set();
Object.values(existingImages.player).flat().forEach(img => existingImageIds.add(img.workoutId));
Object.values(existingImages.groupMember).flat().forEach(img => existingImageIds.add(img.workoutId));

console.log('🎨 Starting image generation for all new workouts...');
console.log(`📊 Existing images: ${existingImageIds.size}`);

// Count new workouts needed
let newWorkoutsNeeded = 0;
Object.entries(workoutData.player).forEach(([category, workouts]) => {
  workouts.forEach(workout => {
    if (!existingImageIds.has(workout.id)) {
      newWorkoutsNeeded++;
    }
  });
});
Object.entries(workoutData.groupMember).forEach(([category, workouts]) => {
  workouts.forEach(workout => {
    if (!existingImageIds.has(workout.id)) {
      newWorkoutsNeeded++;
    }
  });
});

console.log(`🆕 New images needed: ${newWorkoutsNeeded}`);

async function generateWorkoutImage(workout, userRole, category) {
  if (existingImageIds.has(workout.id)) {
    console.log(`⏭️ Skipping ${workout.id} - image already exists`);
    return null;
  }

  try {
    console.log(`🎨 Generating image for: ${workout.title} (${userRole})`);
    
    // Generate role-appropriate prompt
    let prompt;
    if (userRole === 'groupMember') {
      // General fitness prompt for group members
      prompt = `Fitness training workout: ${workout.title}. Athletic person training scene, dynamic action, gym or outdoor setting, motivational and energetic style. Clean illustration, no text.`;
    } else {
      // Hockey-specific prompt for hockey players
      prompt = `Hockey training workout: ${workout.title}. Athletic hockey player training scene, dynamic action, hockey equipment, ice rink or gym setting, motivational and energetic style. Clean illustration, no text.`;
    }
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data[0].url;
    console.log(`✅ Generated image for: ${workout.title}`);
    
    return {
      workoutId: workout.id,
      workoutTitle: workout.title,
      imagePath: `./assets/workout-images/${workout.id}.png`,
      imageUrl: imageUrl
    };
    
  } catch (error) {
    console.error(`❌ Error generating image for ${workout.title}:`, error.message);
    return null;
  }
}

async function generateAllImages() {
  const newImages = {
    player: {
      hockey_conditioning: [],
      strength_training: [],
      speed_agility: []
    },
    groupMember: {
      hockey_fitness: [],
      hockey_strength: [],
      hockey_mobility: []
    }
  };

  // Copy existing images
  Object.entries(existingImages.player).forEach(([category, images]) => {
    newImages.player[category] = [...images];
  });
  Object.entries(existingImages.groupMember).forEach(([category, images]) => {
    newImages.groupMember[category] = [...images];
  });

  let generatedCount = 0;
  
  // Generate images for player workouts
  for (const [category, workouts] of Object.entries(workoutData.player)) {
    console.log(`\\n🏒 Processing player ${category} workouts...`);
    
    for (const workout of workouts) {
      const imageData = await generateWorkoutImage(workout, 'player', category);
      if (imageData) {
        newImages.player[category].push(imageData);
        generatedCount++;
      }
      
      // Add delay to respect rate limits (5 requests per minute)
      await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds between requests
    }
  }

  // Generate images for group member workouts
  for (const [category, workouts] of Object.entries(workoutData.groupMember)) {
    console.log(`\\n👥 Processing group member ${category} workouts...`);
    
    for (const workout of workouts) {
      const imageData = await generateWorkoutImage(workout, 'groupMember', category);
      if (imageData) {
        newImages.groupMember[category].push(imageData);
        generatedCount++;
      }
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds between requests
    }
  }

  // Save updated images to file
  fs.writeFileSync('../src/data/workoutImages.json', JSON.stringify(newImages, null, 2));
  
  console.log(`\\n🎉 Image generation complete!`);
  console.log(`📊 Generated ${generatedCount} new images`);
  console.log(`📁 Updated file: ../src/data/workoutImages.json`);
  
  // Print summary
  let totalImages = 0;
  Object.values(newImages.player).forEach(images => totalImages += images.length);
  Object.values(newImages.groupMember).forEach(images => totalImages += images.length);
  
  console.log(`\\n📊 Total images: ${totalImages}`);
  console.log(`📊 Player images: ${Object.values(newImages.player).flat().length}`);
  console.log(`📊 Group member images: ${Object.values(newImages.groupMember).flat().length}`);
}

// Run the image generation
generateAllImages().catch(console.error);