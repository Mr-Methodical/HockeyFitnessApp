const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081', 'exp://192.168.1.100:8081'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Specific rate limit for AI endpoints (more restrictive)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit to 5 AI requests per minute per IP
  message: 'AI request limit exceeded, please wait before trying again.'
});

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// AI Workout Generation Endpoint
app.post('/api/ai/generate-workout', aiLimiter, async (req, res) => {
  try {
    const { preferences, userRole } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return res.status(500).json({ error: 'AI service configuration error' });
    }

    const {
      duration = '30-45 minutes',
      focus = userRole === 'group_member' ? 'general fitness' : 'hockey-specific',
      equipment = 'minimal equipment',
      fitnessLevel = 'intermediate',
      goals = userRole === 'group_member' ? 'improve overall fitness and athletic performance' : 'improve overall hockey performance',
      customSpecifications = null
    } = preferences;

    // Build role-appropriate prompts
    let basePrompt, systemContent, skillsDescription;
    
    if (userRole === 'group_member') {
      // General fitness prompts for group members
      basePrompt = `Generate a detailed general fitness workout plan with the following specifications:
    
Duration: ${duration}
Focus: ${focus}
Equipment: ${equipment}
Fitness Level: ${fitnessLevel}
Goals: ${goals}

CRITICAL: This is for general fitness training - do NOT include any hockey, ice sports, skating, or sport-specific references in the title, description, or exercises.`;
      
      systemContent = "You are a professional fitness trainer. Generate detailed, safe, and effective workout plans for general fitness and athletic performance. NEVER mention hockey, ice sports, skating, or any sport-specific terms. IMPORTANT: Always respond with ONLY valid JSON format - no additional text, explanations, or markdown formatting. Start with { and end with }.";
      
      skillsDescription = "Make sure the workout is well-rounded and includes exercises that improve cardiovascular health, strength, flexibility, and overall athletic performance. Include functional movements and general fitness exercises with NO sport-specific references.";
    } else {
      // Hockey-specific prompts for hockey players and coaches
      basePrompt = `Generate a detailed hockey workout plan with the following specifications:
    
Duration: ${duration}
Focus: ${focus}
Equipment: ${equipment}
Fitness Level: ${fitnessLevel}
Goals: ${goals}`;

      systemContent = "You are a professional hockey coach and fitness trainer. Generate detailed, safe, and effective workout plans specifically designed for hockey players. IMPORTANT: Always respond with ONLY valid JSON format - no additional text, explanations, or markdown formatting. Start with { and end with }.";
      
      skillsDescription = "Make sure the workout is specifically designed for hockey players and includes exercises that improve skating, shooting, passing, and game performance. Include both on-ice and off-ice training elements.";
    }

    // Build the base prompt
    let prompt = basePrompt;

    // Add custom specifications if provided
    if (customSpecifications) {
      prompt += `\n\nIMPORTANT CUSTOM REQUIREMENTS: ${customSpecifications}`;
    }

    prompt += `

Please format the response as a JSON object with the following structure:
{
  "title": "Workout title",
  "description": "Brief description of the workout",
  "estimatedDuration": "duration in minutes",
  "difficulty": "beginner/intermediate/advanced",
  "equipment": "required equipment as a string",
  "warmup": [
    {
      "exercise": "Exercise name",
      "duration": "time or reps",
      "description": "How to perform this exercise"
    }
  ],
  "mainWorkout": [
    {
      "exercise": "Exercise name",
      "sets": "number of sets",
      "reps": "reps or duration",
      "rest": "rest time between sets",
      "description": "Detailed instructions",
      "tips": "Pro tips for hockey players"
    }
  ],
  "cooldown": [
    {
      "exercise": "Exercise name",
      "duration": "time",
      "description": "Instructions"
    }
  ]
}

${skillsDescription}`;

    console.log(`🤖 Generating workout for preferences (role: ${userRole || 'default'}):`, { duration, focus, equipment, fitnessLevel, customSpecifications });

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
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
      max_tokens: 2000,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    console.log('✅ AI workout generated successfully');

    // Parse and validate the JSON response
    let workoutData;
    try {
      workoutData = JSON.parse(response);
      
      // Add unique IDs to exercises for tracking completion
      if (workoutData.warmup) {
        workoutData.warmup = workoutData.warmup.map((exercise, index) => ({
          ...exercise,
          id: `warmup-${index}`,
          completed: false
        }));
      }
      
      if (workoutData.mainWorkout) {
        workoutData.mainWorkout = workoutData.mainWorkout.map((exercise, index) => ({
          ...exercise,
          id: `main-${index}`,
          completed: false
        }));
      }
      
      if (workoutData.cooldown) {
        workoutData.cooldown = workoutData.cooldown.map((exercise, index) => ({
          ...exercise,
          id: `cooldown-${index}`,
          completed: false
        }));
      }

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return res.status(500).json({ error: 'Invalid AI response format' });
    }

    res.json({ success: true, workout: workoutData });

  } catch (error) {
    console.error('AI workout generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate workout',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI Image Generation Endpoint
app.post('/api/ai/generate-image', aiLimiter, async (req, res) => {
  try {
    const { title, description, userRole } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found');
      return res.status(500).json({ error: 'AI service configuration error' });
    }

    // Generate role-appropriate prompt
    let prompt;
    if (userRole === 'group_member') {
      // General fitness prompt for group members
      prompt = `Fitness training workout: ${title}. Athletic person training scene, dynamic action, gym or outdoor setting, motivational and energetic style. Clean illustration, no text.`;
    } else {
      // Hockey-specific prompt for hockey players and coaches
      prompt = `Hockey training workout: ${title}. Athletic hockey player training scene, dynamic action, hockey equipment, ice rink or gym setting, motivational and energetic style. Clean illustration, no text.`;
    }
    
    console.log(`🎨 Generating AI image for workout: ${title} (role: ${userRole || 'default'})`);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024", // DALL-E 3 standard size
      quality: "standard", // Standard quality for backend
    });

    const temporaryImageUrl = response.data[0].url;
    console.log('✅ AI image generated successfully');

    // Note: In a production environment, you should download this temporary image
    // and upload it to your own permanent storage (Firebase Storage, AWS S3, etc.)
    // For now, we're returning the temporary URL but it will expire
    console.log('⚠️ Warning: Returning temporary DALL-E URL that will expire');
    
    res.json({ success: true, imageUrl: temporaryImageUrl });

  } catch (error) {
    console.error('AI image generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🔑 OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});

module.exports = app;
