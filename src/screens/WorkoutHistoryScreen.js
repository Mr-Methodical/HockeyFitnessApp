import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Animated
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { getBasicTeamWorkouts, getBasicTeamMembers, getBasicUserWorkouts } from '../services/basicFirestore';
import WorkoutCard from '../components/WorkoutCard';

const WorkoutHistoryScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const { currentTheme } = useTheme();
  const [workouts, setWorkouts] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'player', 'type'
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'thisWeek', 'thisMonth', 'player'
  const [selectedPlayer, setSelectedPlayer] = useState('all');
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [animatedHeight] = useState(new Animated.Value(1));

  const isCoach = userProfile?.role === 'coach';

  const toggleFilters = () => {
    const toValue = filtersVisible ? 0 : 1;
    setFiltersVisible(!filtersVisible);
    
    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    loadWorkoutHistory();
  }, []);

  const loadWorkoutHistory = async () => {
    if (!userProfile?.teamId) return;

    console.log('🔍 Loading WorkoutHistory data for team:', userProfile.teamId);

    try {
      setLoading(true);
      
      if (isCoach) {
        // Coach: Load data sequentially to avoid Firestore assertion errors
        console.log('🔍 Step 1: Loading team workouts...');
        const teamWorkouts = await getBasicTeamWorkouts(userProfile.teamId, 1000); // Increase limit for complete history
        
        console.log('🔍 Step 2: Loading team members...');
        const members = await getBasicTeamMembers(userProfile.teamId);

        console.log('🔍 WorkoutHistory data loaded successfully');

        // Add player names to workouts
        const workoutsWithPlayerNames = teamWorkouts.map(workout => {
          const member = members.find(m => m.id === workout.userId);
          return {
            ...workout,
            userName: member?.name || 'Unknown Player'
          };
        });

        setWorkouts(workoutsWithPlayerNames);
        setTeamMembers(members.filter(m => m.role === 'player'));
      } else {
        // Player: Load only their own workouts
        const userWorkouts = await getBasicUserWorkouts(user.uid);
        
        // Add user's own name to workouts for consistency
        const workoutsWithUserName = userWorkouts.map(workout => ({
          ...workout,
          userName: userProfile.name || 'Me'
        }));

        setWorkouts(workoutsWithUserName);
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('❌ Error loading workout history:', error);
      
      // Handle specific Firestore errors
      if (error.message?.includes('assertion') || error.message?.includes('FIRESTORE')) {
        console.error('❌ Firestore assertion error detected in WorkoutHistoryScreen');
        // Reset state to prevent cascading errors
        setWorkouts([]);
        setTeamMembers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWorkoutHistory();
    setRefreshing(false);
  };

  const getFilteredAndSortedWorkouts = () => {
    let filtered = [...workouts];

    // Apply filters
    if (filterBy === 'thisWeek') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(w => w.timestamp?.toDate() > weekAgo);
    } else if (filterBy === 'thisMonth') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(w => w.timestamp?.toDate() > monthAgo);
    } else if (selectedPlayer !== 'all') {
      filtered = filtered.filter(w => w.userId === selectedPlayer);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.timestamp?.toDate() || new Date(0)) - (a.timestamp?.toDate() || new Date(0));
        case 'oldest':
          return (a.timestamp?.toDate() || new Date(0)) - (b.timestamp?.toDate() || new Date(0));
        case 'player':
          return a.userName.localeCompare(b.userName);
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleLikeUpdate = (workoutId, newLikeCount, userLiked) => {
    setWorkouts(prevWorkouts => 
      prevWorkouts.map(w => 
        w.id === workoutId 
          ? { 
              ...w, 
              likeCount: newLikeCount, 
              likes: userLiked 
                ? [...(w.likes || []), userProfile.id] 
                : (w.likes || []).filter(id => id !== userProfile.id) 
            }
          : w
      )
    );
  };

  const renderWorkoutItem = ({ item }) => (
    <WorkoutCard
      workout={item}
      showPlayerName={isCoach} // Only show player names for coaches
      navigation={navigation}
      currentUserId={userProfile?.uid}
      onPress={() => {
        if (item.isAIGenerated) {
          navigation.navigate('AIWorkoutDetail', { workout: item });
        } else {
          navigation.navigate('WorkoutDetail', { 
            workout: item,
            showAllDetails: true 
          });
        }
      }}
      onLikeUpdate={handleLikeUpdate}
      showDeleteButton={isCoach || item.userId === user.uid} // Coaches can delete any, players can delete their own
      onDelete={(workoutId) => {
        setWorkouts(prevWorkouts => 
          prevWorkouts.filter(w => w.id !== workoutId)
        );
      }}
      style={styles.workoutCard}
    />
  );

  const filteredWorkouts = getFilteredAndSortedWorkouts();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>Loading workout history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
          {isCoach ? 'Team Workout History' : 'My Workout History'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Summary */}
      <View style={[styles.statsContainer, { backgroundColor: currentTheme.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: currentTheme.primary }]}>{filteredWorkouts.length}</Text>
          <Text style={[styles.statLabel, { color: currentTheme.textMuted }]}>Total Workouts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {filteredWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)}
          </Text>
          <Text style={[styles.statLabel, { color: currentTheme.textMuted }]}>Total Minutes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {isCoach 
              ? new Set(filteredWorkouts.map(w => w.userId)).size 
              : filteredWorkouts.filter(w => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return w.timestamp?.toDate() > weekAgo;
                }).length
            }
          </Text>
          <Text style={styles.statLabel}>
            {isCoach ? 'Active Players' : 'This Week'}
          </Text>
        </View>
      </View>

      {/* Filters and Sort */}
      <View style={[styles.controlsContainer, { backgroundColor: currentTheme.surface }]}>
        {/* Filter Toggle Header */}
        <TouchableOpacity 
          style={styles.filterToggle} 
          onPress={toggleFilters}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterToggleText, { color: currentTheme.text }]}>Filters & Sort</Text>
          <MaterialIcons 
            name={filtersVisible ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>

        {/* Collapsible Filter Content */}
        <Animated.View 
          style={[
            styles.filterContent,
            {
              opacity: animatedHeight,
              maxHeight: animatedHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500], // Adjust based on content height
              }),
            }
          ]}
        >
          {/* Time Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: currentTheme.text }]}>Time Period:</Text>
            <View style={styles.filterButtons}>
              {['all', 'thisWeek', 'thisMonth'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    filterBy === filter && styles.filterButtonActive
                  ]}
                  onPress={() => setFilterBy(filter)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    filterBy === filter && styles.filterButtonTextActive
                  ]}>
                    {filter === 'all' ? 'All Time' : 
                     filter === 'thisWeek' ? 'This Week' : 'This Month'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Player Filter - Only for coaches */}
          {isCoach && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Player:</Text>
              <View style={styles.playerFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.playerFilterButton,
                    selectedPlayer === 'all' && styles.filterButtonActive
                  ]}
                  onPress={() => setSelectedPlayer('all')}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedPlayer === 'all' && styles.filterButtonTextActive
                  ]}>
                    All Players
                  </Text>
                </TouchableOpacity>
                {teamMembers.slice(0, 3).map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerFilterButton,
                      selectedPlayer === player.id && styles.filterButtonActive
                    ]}
                    onPress={() => setSelectedPlayer(player.id)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedPlayer === player.id && styles.filterButtonTextActive
                    ]}>
                      {player.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort by:</Text>
            <View style={styles.filterButtons}>
              {[
                { key: 'newest', label: 'Newest' },
                { key: 'oldest', label: 'Oldest' },
                { key: 'player', label: 'Player' },
                { key: 'type', label: 'Type' }
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[
                    styles.sortButton,
                    sortBy === sort.key && styles.filterButtonActive
                  ]}
                  onPress={() => setSortBy(sort.key)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    sortBy === sort.key && styles.filterButtonTextActive
                  ]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Workout List */}
      <FlatList
        data={filteredWorkouts}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="fitness-center" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No Workouts Found</Text>
            <Text style={styles.emptySubtitle}>
              {filterBy !== 'all' || (isCoach && selectedPlayer !== 'all')
                ? 'Try adjusting your filters' 
                : isCoach 
                  ? 'Your team hasn\'t logged any workouts yet'
                  : 'You haven\'t logged any workouts yet'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  controlsContainer: {
    marginBottom: 16,
  },
  filterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  filterContent: {
    overflow: 'hidden',
    padding: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  playerFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  workoutCard: {
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
});

export default WorkoutHistoryScreen;
