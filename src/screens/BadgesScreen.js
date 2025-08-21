import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { getUserBadges, calculateUserStats, BADGES } from '../services/badges';
import Badge from '../components/Badge';
import StreakDisplay from '../components/StreakDisplay';

const BadgesScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { currentTheme, isDarkMode } = useTheme();
  const [userBadges, setUserBadges] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // Check if we came from a player profile (should show back button)
  const showBackButton = route?.params?.fromProfile || false;

  useEffect(() => {
    loadBadgesAndStats();
  }, [user]);

  const loadBadgesAndStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [badges, userStats] = await Promise.all([
        getUserBadges(user.uid),
        calculateUserStats(user.uid)
      ]);
      
      setUserBadges(badges);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading badges and stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All', icon: '🏆' },
    { id: 'streak', name: 'Streaks', icon: '🔥' },
    { id: 'total_workouts', name: 'Workouts', icon: '💪' },
    { id: 'total_minutes', name: 'Time', icon: '⏰' },
    { id: 'special', name: 'Special', icon: '⭐' }
  ];

  // Calculate dynamic width for category buttons
  const screenWidth = Dimensions.get('window').width;
  const categoryPadding = 16; // Total horizontal padding (8px on each side)
  const buttonMargin = 8; // Space between buttons
  const totalMarginSpace = (categories.length - 1) * buttonMargin;
  const availableWidth = screenWidth - categoryPadding - totalMarginSpace;
  const buttonWidth = availableWidth / categories.length;

  const getFilteredBadges = () => {
    const allBadges = Object.values(BADGES);
    
    if (selectedCategory === 'all') {
      return allBadges;
    }
    
    if (selectedCategory === 'special') {
      return allBadges.filter(badge => 
        !['streak', 'total_workouts', 'total_minutes'].includes(badge.type)
      );
    }
    
    return allBadges.filter(badge => badge.type === selectedCategory);
  };

  const isBadgeEarned = (badgeId) => {
    return userBadges.some(badge => badge.id === badgeId);
  };

  const getBadgeProgress = (badge) => {
    if (!stats) return 0;
    
    switch (badge.type) {
      case 'streak':
        return Math.min(stats.currentStreak / badge.requirement, 1);
      case 'total_workouts':
        return Math.min(stats.totalWorkouts / badge.requirement, 1);
      case 'total_minutes':
        return Math.min(stats.totalMinutes / badge.requirement, 1);
      case 'weekend_workouts':
        return Math.min(stats.weekendWorkouts / badge.requirement, 1);
      default:
        return isBadgeEarned(badge.id) ? 1 : 0;
    }
  };

  const getProgressText = (badge) => {
    if (!stats) return '';
    
    switch (badge.type) {
      case 'streak':
        return `${stats.currentStreak}/${badge.requirement} days`;
      case 'total_workouts':
        return `${stats.totalWorkouts}/${badge.requirement} workouts`;
      case 'total_minutes':
        return `${stats.totalMinutes}/${badge.requirement} minutes`;
      case 'weekend_workouts':
        return `${stats.weekendWorkouts}/${badge.requirement} weekends`;
      default:
        return isBadgeEarned(badge.id) ? 'Earned!' : 'Not earned';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}>
        <Text style={[styles.loadingText, { color: isDarkMode ? '#FFF' : '#333' }]}>
          Loading badges...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}>
      {/* Header with conditional back button and streak */}
      <View style={showBackButton ? styles.headerContainer : styles.headerContainerFullWidth}>
        {showBackButton && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? '#FFF' : '#333'} />
          </TouchableOpacity>
        )}
        
        {stats && (
          <View style={showBackButton ? styles.streakContainer : styles.streakContainerFullWidth}>
            <StreakDisplay 
              currentStreak={stats.currentStreak} 
              size="medium"
              fullWidth={!showBackButton}
            />
          </View>
        )}
      </View>

      {/* Stats row */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
            <Text style={[styles.statNumber, { color: currentTheme.primary }]}>
              {stats.totalWorkouts}
            </Text>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#CCC' : '#666' }]}>
              Workouts
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
            <Text style={[styles.statNumber, { color: currentTheme.primary }]}>
              {userBadges.length}
            </Text>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#CCC' : '#666' }]}>
              Badges
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
            <Text style={[styles.statNumber, { color: currentTheme.primary }]}>
              {Math.round(stats.totalMinutes / 60)}h
            </Text>
            <Text style={[styles.statLabel, { color: isDarkMode ? '#CCC' : '#666' }]}>
              Training
            </Text>
          </View>
        </View>
      )}

      {/* Category filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={[styles.categoryContainer, { minWidth: screenWidth }]}
      >
        {categories.map((category, index) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              {
                backgroundColor: selectedCategory === category.id 
                  ? currentTheme.primary 
                  : (isDarkMode ? '#1E1E1E' : 'white'),
                width: buttonWidth,
                marginRight: index < categories.length - 1 ? buttonMargin : 0
              }
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text 
              style={[
                styles.categoryText,
                {
                  color: selectedCategory === category.id 
                    ? 'white' 
                    : (isDarkMode ? '#FFF' : '#333')
                }
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Badges grid */}
      <ScrollView 
        style={styles.badgesContainer}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.badgesGrid}>
          {getFilteredBadges().map(badge => {
            const earned = isBadgeEarned(badge.id);
            const progress = getBadgeProgress(badge);
            
            return (
              <View key={badge.id} style={[
                styles.badgeCard,
                { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }
              ]}>
                <View style={[
                  styles.badgeWrapper,
                  !earned && { opacity: 0.4 }
                ]}>
                  <Badge badge={badge} size="medium" />
                </View>
                
                <Text style={[
                  styles.badgeName,
                  { color: isDarkMode ? '#FFF' : '#333' }
                ]}>
                  {badge.name}
                </Text>
                
                <Text style={[
                  styles.badgeDescription,
                  { color: isDarkMode ? '#CCC' : '#666' }
                ]}>
                  {badge.description}
                </Text>
                
                {!earned && progress > 0 && (
                  <>
                    <View style={styles.progressContainer}>
                      <View style={[
                        styles.progressBar,
                        { backgroundColor: isDarkMode ? '#333' : '#E0E0E0' }
                      ]}>
                        <View style={[
                          styles.progressFill,
                          { 
                            width: `${progress * 100}%`,
                            backgroundColor: badge.color
                          }
                        ]} />
                      </View>
                    </View>
                    <Text style={[
                      styles.progressText,
                      { color: isDarkMode ? '#999' : '#888' }
                    ]}>
                      {getProgressText(badge)}
                    </Text>
                  </>
                )}
                
                {earned && (
                  <Text style={[styles.earnedText, { color: badge.color }]}>
                    ✅ Earned!
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
  },
  header: {
    marginBottom: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerContainerFullWidth: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 12,
  },
  streakContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  streakContainerFullWidth: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryScroll: {
    marginBottom: 0,
    maxHeight: 55,
  },
  categoryContainer: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 8,
    height: 45,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  categoryIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgesContainer: {
    flex: 1,
    marginTop: 4,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  badgeCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  badgeWrapper: {
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    textAlign: 'center',
  },
  earnedText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});

export default BadgesScreen;
