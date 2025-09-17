import { doc, updateDoc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Badge definitions
export const BADGES = {
  // Streak badges
  streak_3: {
    id: 'streak_3',
    name: 'Hot Start',
    description: '3-day workout streak',
    icon: '🔥',
    color: '#FF6B35',
    requirement: 3,
    type: 'streak'
  },
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7-day workout streak',
    icon: '💪',
    color: '#FF8500',
    requirement: 7,
    type: 'streak'
  },
  streak_14: {
    id: 'streak_14',
    name: 'Two Week Terror',
    description: '14-day workout streak',
    icon: '⚡',
    color: '#FFB700',
    requirement: 14,
    type: 'streak'
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Machine',
    description: '30-day workout streak',
    icon: '🏆',
    color: '#FFD700',
    requirement: 30,
    type: 'streak'
  },
  streak_50: {
    id: 'streak_50',
    name: 'Unstoppable',
    description: '50-day workout streak',
    icon: '💎',
    color: '#00C9FF',
    requirement: 50,
    type: 'streak'
  },
  streak_100: {
    id: 'streak_100',
    name: 'Century Club',
    description: '100-day workout streak',
    icon: '👑',
    color: '#9D4EDD',
    requirement: 100,
    type: 'streak'
  },

  // Workout count badges
  workouts_10: {
    id: 'workouts_10',
    name: 'Getting Started',
    description: '10 total workouts',
    icon: '🥉',
    color: '#CD7F32',
    requirement: 10,
    type: 'total_workouts'
  },
  workouts_25: {
    id: 'workouts_25',
    name: 'Committed',
    description: '25 total workouts',
    icon: '🥈',
    color: '#C0C0C0',
    requirement: 25,
    type: 'total_workouts'
  },
  workouts_50: {
    id: 'workouts_50',
    name: 'Dedicated',
    description: '50 total workouts',
    icon: '🥇',
    color: '#FFD700',
    requirement: 50,
    type: 'total_workouts'
  },
  workouts_100: {
    id: 'workouts_100',
    name: 'Elite Athlete',
    description: '100 total workouts',
    icon: '🏅',
    color: '#FF6B35',
    requirement: 100,
    type: 'total_workouts'
  },
  workouts_250: {
    id: 'workouts_250',
    name: 'Workout Legend',
    description: '250 total workouts',
    icon: '🏆',
    color: '#9D4EDD',
    requirement: 250,
    type: 'total_workouts'
  },

  // Minutes badges
  minutes_500: {
    id: 'minutes_500',
    name: 'Time Keeper',
    description: '500 total minutes',
    icon: '⏰',
    color: '#4ECDC4',
    requirement: 500,
    type: 'total_minutes'
  },
  minutes_1000: {
    id: 'minutes_1000',
    name: 'Endurance Fighter',
    description: '1000 total minutes',
    icon: '⏱️',
    color: '#45B7D1',
    requirement: 1000,
    type: 'total_minutes'
  },
  minutes_2500: {
    id: 'minutes_2500',
    name: 'Marathon Master',
    description: '2500 total minutes',
    icon: '⏳',
    color: '#FF6B9D',
    requirement: 2500,
    type: 'total_minutes'
  },

  // Special badges
  first_workout: {
    id: 'first_workout',
    name: 'First Step',
    description: 'Completed first workout',
    icon: '🚀',
    color: '#4ECDC4',
    requirement: 1,
    type: 'first_workout'
  },
  team_player: {
    id: 'team_player',
    name: 'Team Player',
    description: 'Joined a team',
    icon: '🤝',
    color: '#45B7D1',
    requirement: 1,
    type: 'team_join'
  },
  weekend_warrior: {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Workout on 5 weekends',
    icon: '🌟',
    color: '#FF8A65',
    requirement: 5,
    type: 'weekend_workouts'
  }
};

// Calculate current streak for a user
export const calculateCurrentStreak = async (userId) => {
  try {
    const workoutsRef = collection(db, 'workouts');
    // Simple query without orderBy to avoid composite index requirement
    const q = query(workoutsRef, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    const workouts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date ? doc.data().date.toDate() : new Date()
    }))
    // Sort in memory instead of in the query
    .sort((a, b) => b.date - a.date);

    if (workouts.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if there's a workout today or yesterday (grace period)
    const mostRecentWorkout = new Date(workouts[0].date);
    mostRecentWorkout.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - mostRecentWorkout) / (1000 * 60 * 60 * 24));
    
    // If the most recent workout is more than 1 day ago, streak is broken
    if (daysDiff > 1) return 0;
    
    // Count consecutive days with workouts
    const workoutDates = new Set();
    workouts.forEach(workout => {
      const date = new Date(workout.date);
      date.setHours(0, 0, 0, 0);
      workoutDates.add(date.toDateString());
    });
    
    let currentDate = new Date(today);
    if (daysDiff === 1) {
      // If no workout today, start from yesterday
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    while (workoutDates.has(currentDate.toDateString())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
};

// Calculate user stats for badge checking
export const calculateUserStats = async (userId) => {
  try {
    const workoutsRef = collection(db, 'workouts');
    const q = query(workoutsRef, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    const workouts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date ? doc.data().date.toDate() : new Date()
    }));

    console.log('🏃 Badge system - calculating stats for user:', userId);
    console.log('📊 Badge system - found workouts:', workouts.length);
    console.log('📋 Badge system - workout types:', workouts.map(w => ({ id: w.id, type: w.type, duration: w.duration })));

    const totalWorkouts = workouts.length;
    const totalMinutes = workouts.reduce((sum, workout) => sum + (workout.duration || 0), 0);
    const currentStreak = await calculateCurrentStreak(userId);
    
    // Calculate weekend workouts
    const weekendWorkouts = workouts.filter(workout => {
      const day = workout.date.getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    }).length;

    console.log('📊 Badge system - calculated stats:', { totalWorkouts, totalMinutes, currentStreak, weekendWorkouts });

    return {
      totalWorkouts,
      totalMinutes,
      currentStreak,
      weekendWorkouts
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return {
      totalWorkouts: 0,
      totalMinutes: 0,
      currentStreak: 0,
      weekendWorkouts: 0
    };
  }
};

// Check and award new badges
export const checkAndAwardBadges = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return [];

    const userData = userDoc.data();
    const currentBadges = userData.badges || [];
    const stats = await calculateUserStats(userId);
    
    const newBadges = [];
    
    // Check each badge
    Object.values(BADGES).forEach(badge => {
      // Skip if user already has this badge
      if (currentBadges.includes(badge.id)) return;
      
      let earned = false;
      
      switch (badge.type) {
        case 'streak':
          earned = stats.currentStreak >= badge.requirement;
          break;
        case 'total_workouts':
          earned = stats.totalWorkouts >= badge.requirement;
          break;
        case 'total_minutes':
          earned = stats.totalMinutes >= badge.requirement;
          break;
        case 'first_workout':
          earned = stats.totalWorkouts >= 1;
          break;
        case 'team_join':
          earned = userData.teamId ? true : false;
          break;
        case 'weekend_workouts':
          earned = stats.weekendWorkouts >= badge.requirement;
          break;
      }
      
      if (earned) {
        newBadges.push(badge.id);
      }
    });
    
    // Update user document with new badges
    if (newBadges.length > 0) {
      const updatedBadges = [...currentBadges, ...newBadges];
      await updateDoc(userRef, { 
        badges: updatedBadges,
        lastBadgeCheck: new Date()
      });
      
      console.log(`✅ Awarded ${newBadges.length} new badges to user ${userId}`);
    }
    
    return newBadges.map(badgeId => BADGES[badgeId]);
  } catch (error) {
    console.error('Error checking badges:', error);
    return [];
  }
};

// Get user's badges
export const getUserBadges = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return [];
    
    const userData = userDoc.data();
    const badgeIds = userData.badges || [];
    
    return badgeIds.map(badgeId => BADGES[badgeId]).filter(Boolean);
  } catch (error) {
    console.error('Error getting user badges:', error);
    return [];
  }
};

// Get longest streak for a user
export const getLongestStreak = async (userId) => {
  try {
    const workoutsRef = collection(db, 'workouts');
    // Simple query without orderBy to avoid composite index requirement
    const q = query(workoutsRef, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    const workouts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date ? doc.data().date.toDate() : new Date()
    }))
    // Sort in memory instead of in the query
    .sort((a, b) => a.date - b.date);

    if (workouts.length === 0) return 0;

    const workoutDates = new Set();
    workouts.forEach(workout => {
      const date = new Date(workout.date);
      date.setHours(0, 0, 0, 0);
      workoutDates.add(date.toDateString());
    });
    
    let maxStreak = 0;
    let currentStreak = 0;
    let currentDate = new Date(workouts[0].date);
    currentDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= endDate) {
      if (workoutDates.has(currentDate.toDateString())) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return maxStreak;
  } catch (error) {
    console.error('Error calculating longest streak:', error);
    return 0;
  }
};
