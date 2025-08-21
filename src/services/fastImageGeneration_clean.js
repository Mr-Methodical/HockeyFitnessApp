/**
 * Fast Image Generation Service - Simple DALL-E Only
 * Uses the same working DALL-E system with role-specific prompts
 */

import OpenAI from 'openai';

// Initialize OpenAI client for image generation
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Generate workout image with DALL-E using role-specific prompts
 * @param {string} title - Workout title
 * @param {string} description - Workout description  
 * @param {string} userId - User ID for storage
 * @param {string} speed - Generation speed (ignored - always uses DALL-E)
 * @param {string} userRole - User role for prompt customization
 * @returns {Promise<string|null>} Image URL or null
 */
export const generateWorkoutImageFast = async (title, description, userId, speed = 'fast', userRole = null) => {
  try {
    console.log('🎨 Generating DALL-E workout image...');
    
    // Create role-specific image prompts (same as working system)
    let imagePrompt;
    
    if (userRole === 'group_member') {
      // General fitness image prompts for group members
      imagePrompt = `A modern fitness scene showing someone doing ${title}. Clean, motivational style with bright lighting. Focus on proper form and technique. Minimalist background.`;
    } else {
      // Hockey-specific image prompts for players/coaches
      imagePrompt = `A hockey training scene showing ${title}. Professional hockey equipment and setting. Dynamic action shot with ice rink or training facility background. Focus on hockey-specific movements and gear.`;
    }

    console.log(`🎨 Generating image with prompt: ${imagePrompt}`);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data[0]?.url;
    if (imageUrl) {
      console.log('✅ DALL-E workout image generated successfully');
      return imageUrl;
    }
    
    console.log('❌ DALL-E returned no image URL');
    return null;

  } catch (error) {
    console.error('❌ DALL-E image generation failed:', error);
    return null;
  }
};
