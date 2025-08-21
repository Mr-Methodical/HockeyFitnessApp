import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { getBasicTeamWorkouts, getBasicTeamMembers } from '../services/basicFirestore';
import WorkoutCard from '../components/WorkoutCard';

const TeamWorkoutsScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [filtersVisible, setFiltersVisible] = useState(false); // Start collapsed for cleaner look
  const [animatedHeight] = useState(new Animated.Value(0));

  useEffect(() => {
    loadTeamWorkouts();
  }, []);

  const toggleFilters = () => {
    const toValue = filtersVisible ? 0 : 1;
    setFiltersVisible(!filtersVisible);
    
    Animated.timing(animatedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const getFilteredAndSortedWorkouts = () => {
    let filtered = [...workouts];

    // Apply time filter
    if (filterBy === 'thisWeek') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(workout => {
        const workoutDate = workout.timestamp?.toDate() || new Date(workout.timestamp);
        return workoutDate > weekAgo;
      });
    } else if (filterBy === 'thisMonth') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(workout => {
        const workoutDate = workout.timestamp?.toDate() || new Date(workout.timestamp);
        return workoutDate > monthAgo;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (a.timestamp?.toDate() || new Date(a.timestamp)) - (b.timestamp?.toDate() || new Date(b.timestamp));
        case 'player':
          return (a.playerName || '').localeCompare(b.playerName || '');
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'newest':
        default:
          return (b.timestamp?.toDate() || new Date(b.timestamp)) - (a.timestamp?.toDate() || new Date(a.timestamp));
      }
    });

    return filtered;
  };

  const loadTeamWorkouts = async () => {
    if (!userProfile?.teamId) return;

    console.log('🔍 Loading TeamWorkouts data for team:', userProfile.teamId);

    try {
      setLoading(true);
      
      // Load data sequentially to avoid Firestore assertion errors
      console.log('🔍 Step 1: Loading team workouts...');
      const teamWorkouts = await getBasicTeamWorkouts(userProfile.teamId, 1000); // Increase limit for complete data
      
      console.log('🔍 Step 2: Loading team members...');
      const members = await getBasicTeamMembers(userProfile.teamId);

      console.log('🔍 TeamWorkouts data loaded successfully');

      // Add player names to workouts
      const workoutsWithPlayerNames = teamWorkouts.map(workout => {
        const member = members.find(m => m.id === workout.userId);
        return {
          ...workout,
          userName: member?.name || 'Unknown Player',
          playerName: member?.name || 'Unknown Player' // For sorting compatibility
        };
      });

      setWorkouts(workoutsWithPlayerNames);
    } catch (error) {
      console.error('❌ Error loading team workouts:', error);
      
      // Handle specific Firestore errors
      if (error.message?.includes('assertion') || error.message?.includes('FIRESTORE')) {
        console.error('❌ Firestore assertion error detected in TeamWorkoutsScreen');
        // Reset state to prevent cascading errors
        setWorkouts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTeamWorkouts();
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
      showPlayerName={true}
      navigation={navigation}
      currentUserId={userProfile?.uid}
      onPress={() => navigation.navigate('WorkoutDetail', { 
        workout: item,
        showAllDetails: true 
      })}
      onLikeUpdate={handleLikeUpdate}
      showDeleteButton={userProfile?.role === 'coach'}
      onDelete={(workoutId) => {
        // Remove the deleted workout from the local array
        setWorkouts(prevWorkouts => 
          prevWorkouts.filter(w => w.id !== workoutId)
        );
      }}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Team Workouts</Text>
        <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
          <MaterialIcons 
            name="refresh" 
            size={24} 
            color={refreshing ? "#ccc" : "#007AFF"} 
          />
        </TouchableOpacity>
      </View>

      {/* Filters and Sort */}
      <View style={styles.controlsContainer}>
        {/* Filter Toggle Header */}
        <TouchableOpacity 
          style={styles.filterToggle} 
          onPress={toggleFilters}
          activeOpacity={0.7}
        >
          <Text style={styles.filterToggleText}>Filters & Sort</Text>
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
                outputRange: [0, 200],
              }),
            }
          ]}
        >
          {/* Time Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Time Period:</Text>
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
                    styles.filterButton,
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

      {getFilteredAndSortedWorkouts().length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="fitness-center" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Team Workouts</Text>
          <Text style={styles.emptySubtitle}>
            {filterBy !== 'all' 
              ? 'Try adjusting your filters to see more workouts.'
              : 'Your teammates haven\'t logged any workouts yet.\nBe the first to inspire your team!'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredAndSortedWorkouts()}
          renderItem={renderWorkoutItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.workoutsList}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  workoutsList: {
    padding: 16,
    paddingBottom: 100,
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
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
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
    marginBottom: 12,
  },
  workoutDetails: {
    flex: 1,
    marginRight: 12,
  },
  workoutType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
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
  workoutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  controlsContainer: {
    backgroundColor: '#FFFFFF',
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
});

export default TeamWorkoutsScreen;
