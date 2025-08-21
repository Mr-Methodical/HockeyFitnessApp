import { getBasicTeamMembers, getBasicTeamWorkouts } from './basicFirestore';
import { updateTeam } from './team';

/**
 * Simple Rule-Based Scoring System for Hockey Accountability App
 * 
 * Scoring Formula:
 * - Base workout score: Duration (minutes) * 1.0
 * - Workout type multipliers:
 *   - Cardio/Conditioning: 1.2x (endurance focused)
 *   - Strength/Weight Training: 1.1x (strength building)
 *   - Skating/Speed: 1.15x (sport-specific)
 *   - Skills/Stick Handling: 1.05x (technical development)
 *   - Recovery/Flexibility: 0.9x (important but lower intensity)
 *   - AI-Generated: 1.1x (complete structured workouts)
 * - Intensity bonus: +10% per intensity point above 5
 * - Consistency bonus: +5% per day in current streak
 * - Recent activity bonus: +20% for workouts in last 3 days
 */

// Workout type scoring multipliers
const TYPE_MULTIPLIERS = {
  'cardio': 1.2,
  'conditioning': 1.2,
  'strength': 1.1,
  'weight training': 1.1,
  'weights': 1.1,
  'skating': 1.15,
  'speed': 1.15,
  'agility': 1.15,
  'skills': 1.05,
  'stick handling': 1.05,
  'shooting': 1.05,
  'recovery': 0.9,
  'flexibility': 0.9,
  'stretching': 0.9,
  'ai-generated': 1.1,
  'ai generated': 1.1,
  'default': 1.0
};

/**
 * Calculate score for a single workout
 */
export const calculateWorkoutScore = (workout) => {
  if (!workout.duration) {
    console.log('⚠️ Workout has no duration:', workout.id || 'unknown');
    return 0;
  }
  
  // Base score: duration in minutes
  let score = workout.duration * 1.0;
  
  // Apply workout type multiplier
  const workoutType = (workout.type || '').toLowerCase();
  let multiplier = TYPE_MULTIPLIERS.default;
  
  // Find matching type multiplier
  Object.keys(TYPE_MULTIPLIERS).forEach(type => {
    if (workoutType.includes(type)) {
      multiplier = TYPE_MULTIPLIERS[type];
    }
  });
  
  // Check if it's AI-generated
  if (workout.isAIGenerated) {
    multiplier = TYPE_MULTIPLIERS['ai-generated'];
  }
  
  score *= multiplier;
  
  // Intensity bonus: +10% per point above 5
  if (workout.intensity && workout.intensity > 5) {
    const intensityBonus = (workout.intensity - 5) * 0.1;
    score *= (1 + intensityBonus);
  }
  
  // Recent activity bonus: +20% for workouts in last 3 days
  const workoutDate = workout.timestamp?.toDate ? workout.timestamp.toDate() : new Date(workout.timestamp);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  if (workoutDate > threeDaysAgo) {
    score *= 1.2; // 20% bonus for recent activity
  }
  
  const finalScore = Math.round(score * 100) / 100;
  console.log(`✅ Workout score: ${finalScore} (duration: ${workout.duration}, type: ${workout.type}, multiplier: ${multiplier})`);
  return finalScore; // Round to 2 decimal places
};

/**
 * Calculate current workout streak for a player
 */
export const calculateStreakBonus = (playerWorkouts) => {
  if (!playerWorkouts || playerWorkouts.length === 0) return 0;
  
  // Sort workouts by date (newest first)
  const sortedWorkouts = [...playerWorkouts]
    .map(workout => ({
      ...workout,
      date: workout.timestamp?.toDate ? workout.timestamp.toDate() : new Date(workout.timestamp)
    }))
    .sort((a, b) => b.date - a.date);
  
  // Check if player worked out today or yesterday (to account for different time zones)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const mostRecentWorkout = sortedWorkouts[0].date;
  mostRecentWorkout.setHours(0, 0, 0, 0);
  
  if (mostRecentWorkout < yesterday) {
    return 0; // Streak is broken
  }
  
  // Calculate consecutive days
  let streak = 0;
  let currentDate = new Date(today);
  
  const workoutDates = new Set(
    sortedWorkouts.map(w => {
      const date = new Date(w.date);
      date.setHours(0, 0, 0, 0);
      return date.toDateString();
    })
  );
  
  // Count backwards from today
  while (workoutDates.has(currentDate.toDateString())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
};

/**
 * Calculate comprehensive score for a player
 */
export const calculatePlayerScore = (player, playerWorkouts) => {
  if (!playerWorkouts || playerWorkouts.length === 0) {
    return {
      totalScore: 0,
      workoutCount: 0,
      averageScore: 0,
      totalMinutes: 0,
      streak: 0,
      weeklyScore: 0,
      breakdown: {
        baseScore: 0,
        streakBonus: 0,
        weeklyBonus: 0
      }
    };
  }
  
  // Calculate individual workout scores
  const workoutScores = playerWorkouts.map(workout => calculateWorkoutScore(workout));
  const totalWorkoutScore = workoutScores.reduce((sum, score) => sum + score, 0);
  
  // Calculate streak bonus
  const streak = calculateStreakBonus(playerWorkouts);
  const streakBonus = streak * 0.05; // 5% per day in streak
  
  // Calculate weekly activity (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  console.log(`📅 Weekly calculation for ${player.name}:`);
  console.log(`📅 Current date: ${new Date().toISOString()}`);
  console.log(`📅 Week ago cutoff: ${weekAgo.toISOString()}`);
  
  const weeklyWorkouts = playerWorkouts.filter(workout => {
    try {
      let workoutDate;
      if (workout.timestamp?.toDate) {
        workoutDate = workout.timestamp.toDate();
      } else if (workout.timestamp) {
        workoutDate = new Date(workout.timestamp);
      } else if (workout.date?.toDate) {
        workoutDate = workout.date.toDate();
      } else if (workout.date) {
        workoutDate = new Date(workout.date);
      } else if (workout.createdAt?.toDate) {
        workoutDate = workout.createdAt.toDate();
      } else if (workout.createdAt) {
        workoutDate = new Date(workout.createdAt);
      } else {
        console.warn(`📅 Workout missing date field:`, workout.id);
        return false;
      }
      
      const isThisWeek = workoutDate > weekAgo;
      console.log(`📅 Workout date: ${workoutDate.toISOString()}, is this week: ${isThisWeek}`);
      return isThisWeek;
    } catch (error) {
      console.error('📅 Error processing workout date:', error, workout.id);
      return false;
    }
  });
  
  console.log(`📅 ${player.name}: ${weeklyWorkouts.length} workouts this week out of ${playerWorkouts.length} total`);
  
  const weeklyScore = weeklyWorkouts.reduce((sum, workout) => sum + calculateWorkoutScore(workout), 0);
  const weeklyBonus = Math.min(weeklyScore * 0.1, totalWorkoutScore * 0.3); // Max 30% bonus from weekly activity
  
  // Final score calculation
  const baseScore = totalWorkoutScore;
  const streakBonusAmount = baseScore * streakBonus;
  const totalScore = baseScore + streakBonusAmount + weeklyBonus;

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    workoutCount: playerWorkouts.length,
    totalWorkouts: playerWorkouts.length, // Add for compatibility with existing code
    thisWeekWorkouts: weeklyWorkouts.length, // Use the already calculated weeklyWorkouts
    averageScore: Math.round((totalWorkoutScore / playerWorkouts.length) * 100) / 100,
    totalMinutes: playerWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0),
    streak,
    weeklyScore: Math.round(weeklyScore * 100) / 100,
    breakdown: {
      baseScore: Math.round(baseScore * 100) / 100,
      streakBonus: Math.round(streakBonusAmount * 100) / 100,
      weeklyBonus: Math.round(weeklyBonus * 100) / 100
    }
  };
};

/**
 * Generate automatic rankings for a team using rule-based scoring
 */
export const generateAutomaticRankings = async (teamId) => {
  try {
    console.log('🎯 Generating automatic rankings for team:', teamId);
    
    // Load team data using basic functions
    const [members, workouts] = await Promise.all([
      getBasicTeamMembers(teamId),
      getBasicTeamWorkouts(teamId, 1000) // Increase limit for accurate counts
    ]);
    
    console.log('📊 Loaded data:', {
      totalMembers: members.length,
      totalWorkouts: workouts.length,
      workoutUserIds: workouts.map(w => w.userId),
      memberIds: members.map(m => m.id)
    });
    
    // Filter for players and group members (anyone who can have workouts)
    const players = members.filter(member => member.role === 'player' || member.role === 'group_member');
    console.log('👥 Players found:', players.map(p => ({ id: p.id, name: p.name, role: p.role })));
    
    if (players.length === 0) {
      console.log('⚠️ No players found in team');
      return [];
    }
    
    // Calculate scores for each player
    const playerScores = players.map(player => {
      const playerWorkouts = workouts.filter(workout => workout.userId === player.id);
      console.log(`🔍 Player ${player.name} (${player.id}): ${playerWorkouts.length} workouts found`);
      
      // Debug first workout data structure
      if (playerWorkouts.length > 0) {
        const firstWorkout = playerWorkouts[0];
        console.log(`🔍 First workout for ${player.name}:`, {
          id: firstWorkout.id,
          duration: firstWorkout.duration,
          type: firstWorkout.type,
          intensity: firstWorkout.intensity,
          timestamp: firstWorkout.timestamp,
          isAIGenerated: firstWorkout.isAIGenerated,
          userId: firstWorkout.userId,
          hasAllRequiredFields: !!(firstWorkout.duration && firstWorkout.userId)
        });
      }
      
      const scoreData = calculatePlayerScore(player, playerWorkouts);
      console.log(`🔍 Final score for ${player.name}:`, {
        totalScore: scoreData.totalScore,
        workoutCount: scoreData.workoutCount,
        totalMinutes: scoreData.totalMinutes
      });
      
      return {
        ...player,
        ...scoreData
      };
    });
    
    // Sort by total score (highest first)
    const rankedPlayers = playerScores.sort((a, b) => b.totalScore - a.totalScore);
    
    console.log('📊 Automatic rankings generated:', rankedPlayers.map(p => ({
      name: p.name,
      totalScore: p.totalScore,
      workoutCount: p.workoutCount,
      streak: p.streak
    })));
    
    return rankedPlayers;
    
  } catch (error) {
    console.error('❌ Error generating automatic rankings:', error);
    throw error;
  }
};

/**
 * Update team with automatic rankings
 */
export const updateTeamWithAutomaticRankings = async (teamId) => {
  try {
    console.log('🔄 Updating team with automatic rankings...');
    
    const rankedPlayers = await generateAutomaticRankings(teamId);
    
    // Create ranking array with player IDs in order
    const automaticRankings = rankedPlayers.map(player => player.id);
    
    // Update team document
    await updateTeam(teamId, {
      rankingMode: 'automatic',
      automaticRankingBy: 'ruleBasedScore',
      automaticRankings: automaticRankings,
      lastRankingUpdate: new Date(),
      rankingData: rankedPlayers.map(player => ({
        playerId: player.id,
        playerName: player.name,
        totalScore: player.totalScore,
        workoutCount: player.workoutCount,
        totalMinutes: player.totalMinutes,
        streak: player.streak,
        weeklyScore: player.weeklyScore
      }))
    });
    
    console.log('✅ Team rankings updated successfully');
    return rankedPlayers;
    
  } catch (error) {
    console.error('❌ Error updating team rankings:', error);
    throw error;
  }
};

/**
 * Get ranking explanation for display
 */
export const getRankingExplanation = () => {
  return `Rankings are calculated using a comprehensive scoring system:

📊 Base Score:
• Duration × workout type multiplier
• Cardio/Conditioning: +20%
• Strength training: +10%  
• Skating/Speed: +15%
• AI workouts: +10%

⚡ Bonuses:
• Intensity: +10% per point above 5
• Recent activity: +20% for last 3 days
• Streak: +5% per consecutive day
• Weekly activity: Up to +30%

Rankings update automatically after each workout.`;
};

/**
 * Get detailed breakdown for a player's score
 */
export const getPlayerScoreBreakdown = (player, playerWorkouts) => {
  const scoreData = calculatePlayerScore(player, playerWorkouts);
  
  return {
    ...scoreData,
    explanation: getRankingExplanation(),
    recentWorkouts: playerWorkouts
      .slice(-5)
      .map(workout => ({
        type: workout.type,
        duration: workout.duration,
        score: calculateWorkoutScore(workout),
        date: workout.timestamp?.toDate ? workout.timestamp.toDate() : new Date(workout.timestamp)
      }))
  };
};

/**
 * Auto-update rankings after a workout is logged
 * Call this whenever a new workout is saved
 */
export const autoUpdateRankingsAfterWorkout = async (teamId) => {
  try {
    console.log('🔄 Auto-updating rankings after workout for team:', teamId);
    await updateTeamWithAutomaticRankings(teamId);
    console.log('✅ Rankings auto-updated successfully');
  } catch (error) {
    console.error('❌ Error auto-updating rankings:', error);
    // Don't throw - this is a background operation
  }
};

/**
 * Simple test function to check if scoring works
 */
export const testWorkoutScoring = () => {
  const testWorkout = {
    duration: 30,
    type: 'cardio',
    intensity: 7,
    timestamp: new Date(),
    isAIGenerated: false
  };
  
  console.log('🧪 Testing workout scoring with sample workout:', testWorkout);
  const score = calculateWorkoutScore(testWorkout);
  console.log('🧪 Test result - Score should be > 0:', score);
  return score;
};
