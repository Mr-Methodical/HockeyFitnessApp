/**
 * Simple Image Generation - Just copy workout into DALL-E
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Generate workout image by copying workout into DALL-E
 */
export const generateWorkoutImageFast = async (title, description, userId, speed = 'fast', userRole = null) => {
  try {
    console.log('🎨 Creating role-specific workout image...');
    
    // Create role-specific image prompts
    let prompt;
    
    if (userRole === 'group_member') {
      // General fitness image for group members - NO hockey references
      prompt = `Create a motivational fitness workout image based on: ${title}. ${description}. Show general fitness activities like bodyweight exercises, running, or gym equipment. Clean, modern style with bright lighting. NO hockey or sport-specific equipment.`;
    } else {
      // Hockey-specific image for players and coaches
      prompt = `Create a hockey training image based on: ${title}. ${description}. Show hockey-specific training with ice rink, hockey equipment, or hockey drills. Professional hockey setting with dynamic action.`;
    }
    
    console.log(`🎨 DALL-E prompt (${userRole || 'default'}): ${prompt}`);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const temporaryImageUrl = response.data[0]?.url;
    if (!temporaryImageUrl) {
      console.log('❌ Failed to generate image');
      return null;
    }
    
    console.log('✅ Temporary image generated, uploading to permanent storage...');
    
    // Upload to Firebase Storage for permanent storage
    const { uploadAIImageToStorage } = await import('./backendApi');
    const permanentImageUrl = await uploadAIImageToStorage(temporaryImageUrl, userId);
    
    console.log('✅ Fast image permanently stored in Firebase');
    return permanentImageUrl;

  } catch (error) {
    console.error('❌ Image generation error:', error);
    return null;
  }
};
