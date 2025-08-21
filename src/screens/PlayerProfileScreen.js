import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { getBasicUserWorkouts } from '../services/basicFirestore';
import { getUserBadges, calculateCurrentStreak, getLongestStreak, calculateUserStats } from '../services/badges';
import WorkoutCard from '../components/WorkoutCard';
import StreakDisplay from '../components/StreakDisplay';
import Badge from '../components/Badge';

const PlayerProfileScreen = ({ navigation, route }) => {
  const { userProfile, user } = useAuth();
  const { currentTheme, isDarkMode } = useTheme();
  const { player } = route.params; // Player object passed from leaderboard
  const [workouts, setWorkouts] = useState([]);
  const [playerBadges, setPlayerBadges] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'badges', 'workouts'
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalMinutes: 0,
    thisWeekWorkouts: 0,
    mostFrequentType: '',
    averageIntensity: 0
  });

  useEffect(() => {
    loadPlayerData();
  }, []);

  const loadPlayerData = async () => {
    try {
      setLoading(true);
      // Load workouts, badges, and streak data in parallel
      const [playerWorkouts, badges, streak, longest] = await Promise.all([
        getBasicUserWorkouts(player.id), // Use basic function with higher limit
        getUserBadges(player.id),
        calculateCurrentStreak(player.id),
        getLongestStreak(player.id)
      ]);
      
      setWorkouts(playerWorkouts);
      setPlayerBadges(badges);
      setCurrentStreak(streak);
      setLongestStreak(longest);
      calculateStats(playerWorkouts);
    } catch (error) {
      console.error('Error loading player data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (workouts) => {
    if (!workouts.length) {
      setStats({
        totalWorkouts: 0,
        totalMinutes: 0,
        thisWeekWorkouts: 0,
        mostFrequentType: 'None',
        averageIntensity: 0
      });
      return;
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate stats
    let totalMinutes = 0;
    let totalIntensity = 0;
    let thisWeekCount = 0;
    const workoutTypes = {};

    workouts.forEach(workout => {
      totalMinutes += workout.duration || 0;
      totalIntensity += workout.intensity || 0;
      
      // Count workouts from this week
      const workoutDate = workout.createdAt?.toDate ? workout.createdAt.toDate() : new Date(workout.createdAt);
      if (workoutDate >= oneWeekAgo) {
        thisWeekCount++;
      }

      // Count workout types
      const type = workout.type || 'Other';
      workoutTypes[type] = (workoutTypes[type] || 0) + 1;
    });

    // Find most frequent workout type
    const mostFrequentType = Object.keys(workoutTypes).reduce((a, b) => 
      workoutTypes[a] > workoutTypes[b] ? a : b, 'Other'
    );

    setStats({
      totalWorkouts: workouts.length,
      totalMinutes,
      thisWeekWorkouts: thisWeekCount,
      mostFrequentType,
      averageIntensity: workouts.length > 0 ? (totalIntensity / workouts.length).toFixed(1) : 0
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlayerData();
    setRefreshing(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };

  const formatWorkoutTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
    }
  };

  const handleLikeUpdate = (workoutId, newLikeCount, userLiked) => {
    // Update the local workouts array with new like count
    setWorkouts(prevWorkouts => 
      prevWorkouts.map(workout => 
        workout.id === workoutId 
          ? { 
              ...workout, 
              likeCount: newLikeCount,
              likes: userLiked 
                ? [...(workout.likes || []), userProfile.uid]
                : (workout.likes || []).filter(id => id !== userProfile.uid)
            }
          : workout
      )
    );
  };

  const renderWorkoutItem = ({ item }) => (
    <WorkoutCard
      workout={item}
      showPlayerName={false}
      onPress={() => navigation.navigate('WorkoutDetail', { 
        workout: item,
        showAllDetails: true 
      })}
      onLikeUpdate={handleLikeUpdate}
      showDeleteButton={userProfile?.role === 'coach' || item.userId === userProfile?.id}
      onDelete={(workoutId) => {
        // Remove the deleted workout from the local array
        setWorkouts(prevWorkouts => 
          prevWorkouts.filter(w => w.id !== workoutId)
        );
      }}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}>
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFF' : '#333' }]}>
          {player.name}
        </Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <MaterialIcons 
            name="refresh" 
            size={24} 
            color={refreshing ? "#ccc" : currentTheme.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
        {['overview', 'badges', 'workouts'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && { backgroundColor: currentTheme.primary }
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab ? { color: 'white' } : { color: isDarkMode ? '#CCC' : '#666' }
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && (
          <>
            {/* Streak Display */}
            <View style={styles.streakContainer}>
              <StreakDisplay 
                currentStreak={currentStreak}
                longestStreak={longestStreak}
                size="medium"
              />
            </View>

            {/* Player Stats Card */}
            <View style={[styles.statsCard, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
              <View style={styles.statsHeader}>
                <MaterialIcons name="person" size={24} color={currentTheme.primary} />
                <Text style={[styles.statsTitle, { color: isDarkMode ? '#FFF' : '#333' }]}>
                  Performance Stats
                </Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: currentTheme.primary }]}>
                    {stats.totalWorkouts}
                  </Text>
                  <Text style={[styles.statLabel, { color: isDarkMode ? '#CCC' : '#666' }]}>
                    Total Workouts
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: currentTheme.primary }]}>
                    {stats.thisWeekWorkouts}
                  </Text>
                  <Text style={[styles.statLabel, { color: isDarkMode ? '#CCC' : '#666' }]}>
                    This Week
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: currentTheme.primary }]}>
                    {Math.round(stats.totalMinutes / 60)}h
                  </Text>
                  <Text style={[styles.statLabel, { color: isDarkMode ? '#CCC' : '#666' }]}>
                    Training Time
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: currentTheme.primary }]}>
                    {stats.averageIntensity}
                  </Text>
                  <Text style={[styles.statLabel, { color: isDarkMode ? '#CCC' : '#666' }]}>
                    Avg Intensity
                  </Text>
                </View>
              </View>

              <View style={styles.favoriteTypeContainer}>
                <Text style={[styles.favoriteTypeLabel, { color: isDarkMode ? '#CCC' : '#666' }]}>
                  Most Frequent Workout:
                </Text>
                <Text style={[styles.favoriteType, { color: isDarkMode ? '#FFF' : '#333' }]}>
                  {stats.mostFrequentType}
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'badges' && (
          <View style={styles.badgesTab}>
            <View style={[styles.badgesHeader, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
              <Text style={[styles.badgesTitle, { color: isDarkMode ? '#FFF' : '#333' }]}>
                Achievement Badges ({playerBadges.length})
              </Text>
              {user.uid === player.id && (
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Badges', { fromProfile: true })}
                  style={styles.viewAllBadgesButton}
                >
                  <Text style={[styles.viewAllBadgesText, { color: currentTheme.primary }]}>
                    View All
                  </Text>
                  <MaterialIcons name="chevron-right" size={16} color={currentTheme.primary} />
                </TouchableOpacity>
              )}
            </View>

            {playerBadges.length === 0 ? (
              <View style={[styles.noBadgesContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
                <MaterialIcons name="emoji-events" size={48} color="#CCC" />
                <Text style={[styles.noBadgesText, { color: isDarkMode ? '#CCC' : '#666' }]}>
                  No badges earned yet
                </Text>
                <Text style={[styles.noBadgesSubtext, { color: isDarkMode ? '#999' : '#888' }]}>
                  {user.uid === player.id 
                    ? 'Keep logging workouts to earn your first badge!' 
                    : 'This player hasn\'t earned any badges yet.'
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.badgesGrid}>
                {playerBadges.map((badge) => (
                  <View key={badge.id} style={styles.badgeContainer}>
                    <Badge badge={badge} size="large" showDescription={true} expandable={true} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'workouts' && (
          <View style={styles.workoutsTab}>
            {/* Workouts List */}
            <View style={styles.workoutsSection}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFF' : '#333' }]}>
                All Workouts ({workouts.length})
              </Text>
              
              {workouts.length === 0 && !loading ? (
                <View style={[styles.emptyState, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
                  <MaterialIcons name="fitness-center" size={48} color="#ccc" />
                  <Text style={[styles.emptyTitle, { color: isDarkMode ? '#CCC' : '#666' }]}>
                    No Workouts Yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#999' : '#888' }]}>
                    This player hasn't logged any workouts.
                  </Text>
                </View>
              ) : (
                <FlatList
              data={workouts}
              renderItem={renderWorkoutItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  favoriteTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  favoriteTypeLabel: {
    fontSize: 14,
    color: '#666',
  },
  favoriteType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  workoutsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  workoutCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  workoutTime: {
    fontSize: 12,
    color: '#666',
  },
  timeAgo: {
    fontSize: 12,
    color: '#999',
  },
  workoutContent: {
    flexDirection: 'row',
  },
  workoutDetails: {
    flex: 1,
    marginRight: 12,
  },
  workoutDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  workoutStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  workoutImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  streakContainer: {
    margin: 16,
  },
  badgesTab: {
    flex: 1,
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  badgesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllBadgesButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllBadgesText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  noBadgesContainer: {
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noBadgesText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  noBadgesSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  badgeContainer: {
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
  },
  workoutsTab: {
    flex: 1,
  },
});

export default PlayerProfileScreen;
