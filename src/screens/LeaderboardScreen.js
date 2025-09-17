import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { getBasicTeamMembers, getBasicTeamWorkouts, getBasicTeam } from '../services/basicFirestore';
import { 
  generateAutomaticRankings, 
  updateTeamWithAutomaticRankings,
  getRankingExplanation,
  testWorkoutScoring
} from '../services/ruleBasedRanking';

const LeaderboardScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const { currentTheme } = useTheme();
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamWorkouts, setTeamWorkouts] = useState([]);
  const [teamData, setTeamData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('ruleBasedScore'); // Default to rule-based scoring
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    loadLeaderboardData();
  }, [userProfile]);

  // Refresh data when screen comes into focus (e.g., returning from ManualRankings)
  useFocusEffect(
    React.useCallback(() => {
      if (userProfile?.teamId) {
        loadLeaderboardData();
      }
    }, [userProfile?.teamId])
  );

  useEffect(() => {
    // Only calculate leaderboard if we have data
    if (teamMembers.length > 0 && teamWorkouts.length >= 0 && teamData) {
      console.log('🏆 Calculating leaderboard with:', {
        teamMembers: teamMembers.length,
        teamWorkouts: teamWorkouts.length,
        sortBy,
        teamData: !!teamData
      });
      calculateLeaderboard();
    } else {
      console.log('⏳ Waiting for data before calculating leaderboard:', {
        teamMembers: teamMembers.length,
        teamWorkouts: teamWorkouts.length,
        sortBy,
        teamData: !!teamData
      });
    }
  }, [teamMembers, teamWorkouts, teamData, sortBy]);

  const loadLeaderboardData = async () => {
    if (!userProfile?.teamId) {
      console.warn('LeaderboardScreen: No teamId available');
      setLoading(false);
      return;
    }

    console.log('🔍 Loading leaderboard data for team:', userProfile.teamId);

    try {
      setLoading(true);
      
      // Load data sequentially to avoid overwhelming Firestore
      console.log('🔍 Step 1: Loading team members...');
      const members = await getBasicTeamMembers(userProfile.teamId);
      setTeamMembers(members);
      
      console.log('🔍 Step 2: Loading team data...');
      const team = await getBasicTeam(userProfile.teamId);
      
      // Ensure team has ranking data with defaults
      const teamWithDefaults = {
        ...team,
        rankingMode: team?.rankingMode || 'automatic',
        automaticRankingBy: team?.automaticRankingBy || 'totalMinutes',
        manualRankings: Array.isArray(team?.manualRankings) ? team.manualRankings : []
      };
      
      setTeamData(teamWithDefaults);
      
      console.log('🔍 Step 3: Loading team workouts...');
      const workouts = await getBasicTeamWorkouts(userProfile.teamId, 1000); // Increase limit for accurate counts
      setTeamWorkouts(workouts);
      
      console.log('🔍 Leaderboard data loaded successfully');
      
      // Set sort based on team settings
      if (teamWithDefaults.rankingMode === 'automatic' && teamWithDefaults.automaticRankingBy) {
        setSortBy(teamWithDefaults.automaticRankingBy);
      }
    } catch (error) {
      console.error('❌ Error loading leaderboard data:', error);
      
      // Handle specific Firestore errors
      if (error.message?.includes('assertion') || error.message?.includes('FIRESTORE')) {
        console.error('❌ Firestore assertion error detected');
        // Reset state to prevent cascading errors
        setTeamMembers([]);
        setTeamWorkouts([]);
        setTeamData(null);
        setLeaderboard([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboardData();
    
    // Temporarily disable auto-update to avoid errors
    console.log('🔄 Auto-update disabled temporarily');
    /*
    // Auto-update rankings if using rule-based scoring
    if (sortBy === 'ruleBasedScore' && userProfile?.teamId) {
      try {
        await updateTeamWithAutomaticRankings(userProfile.teamId);
        console.log('✅ Rankings auto-updated');
      } catch (error) {
        console.error('Error auto-updating rankings:', error);
      }
    }
    */
    
    setRefreshing(false);
  };

  const calculateLeaderboard = async () => {
    console.log('🏆 Starting leaderboard calculation...');
    
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const players = teamMembers.filter(member => member.role === 'player' || member.role === 'group_member');
    console.log(`🏃 Found ${players.length} participants (players + group members) out of ${teamMembers.length} team members`);
    console.log('👥 Team member roles:', teamMembers.map(m => ({ name: m.name, role: m.role, id: m.id })));
    
    if (players.length === 0) {
      console.log('⚠️ No participants found, setting empty leaderboard');
      console.log('💡 Tip: Make sure team members have role "player" or "group_member" to appear in leaderboard');
      setLeaderboard([]);
      return;
    }
    
    if (sortBy === 'ruleBasedScore') {
      // Use the new rule-based scoring system
      console.log('🎯 Using rule-based scoring for teamId:', userProfile.teamId);
      
      // Test the scoring function first
      const testScore = testWorkoutScoring();
      console.log('🧪 Test workout scoring result:', testScore);
      
      try {
        const rankedPlayers = await generateAutomaticRankings(userProfile.teamId);
        console.log(`✅ Generated ${rankedPlayers.length} ranked players`);
        
        const playersWithUserFlag = rankedPlayers.map(player => ({
          ...player,
          isCurrentUser: player.id === user.uid
        }));
        
        console.log('🏆 Setting leaderboard with ranked players');
        setLeaderboard(playersWithUserFlag);
        return;
      } catch (error) {
        console.error('❌ Error generating automatic rankings:', error);
        // Fall back to traditional sorting
        console.log('🔄 Falling back to traditional sorting');
      }
    }
    
    // Traditional sorting for other metrics (fallback or when not using rule-based)
    console.log('📊 Using traditional sorting, calculating player stats...');
    console.log('📊 LeaderboardScreen teamWorkouts count:', teamWorkouts.length);
    
    const playerStats = players.map(player => {
      const playerWorkouts = teamWorkouts.filter(workout => workout.userId === player.id);
      const thisWeekWorkouts = playerWorkouts.filter(
        workout => workout.timestamp?.toDate() > weekAgo
      );
      const totalMinutes = playerWorkouts.reduce((sum, workout) => sum + (workout.duration || 0), 0);
      
      console.log(`📊 Player ${player.name} (${player.id}): ${playerWorkouts.length} total workouts`);
      
      return {
        ...player,
        totalWorkouts: playerWorkouts.length,
        thisWeekWorkouts: thisWeekWorkouts.length,
        totalMinutes: totalMinutes,
        isCurrentUser: player.id === user.uid
      };
    });

    console.log(`📊 Player stats calculated for ${playerStats.length} players`);

    // Sort based on team ranking mode
    let sortedStats;
    if (teamData?.rankingMode === 'manual' && Array.isArray(teamData?.manualRankings) && teamData.manualRankings.length > 0) {
      // Use manual rankings
      const manualRankings = teamData.manualRankings;
      console.log('📋 Using manual rankings:', manualRankings.length);
      console.log('Available players:', players.map(p => ({ id: p.id, name: p.name })));
      
      sortedStats = [...playerStats].sort((a, b) => {
        const aIndex = manualRankings.indexOf(a.id);
        const bIndex = manualRankings.indexOf(b.id);
        
        // If both are in rankings, sort by their position
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // If only a is in rankings, a comes first
        if (aIndex !== -1) return -1;
        // If only b is in rankings, b comes first
        if (bIndex !== -1) return 1;
        // If neither is in rankings, maintain original order
        return 0;
      });
      
      console.log('📋 Manual rankings applied, sorted order:', sortedStats.map(p => ({ id: p.id, name: p.name })));
    } else {
      // Use automatic sorting (fallback for teams without manual rankings)
      console.log('⚡ Using automatic sorting with sortBy:', sortBy);
      sortedStats = playerStats.sort((a, b) => {
        if (sortBy === 'totalWorkouts') return b.totalWorkouts - a.totalWorkouts;
        if (sortBy === 'thisWeekWorkouts') return b.thisWeekWorkouts - a.thisWeekWorkouts;
        if (sortBy === 'totalMinutes') return b.totalMinutes - a.totalMinutes;
        if (sortBy === 'ruleBasedScore') return (b.totalScore || 0) - (a.totalScore || 0);
        return 0;
      });
      console.log('⚡ Automatic sorting complete, players ordered by:', sortBy);
    }

    console.log(`✅ Setting leaderboard with ${sortedStats.length} players`);
    setLeaderboard(sortedStats);
  };

  const getSortButtonStyle = (type) => [
    styles.sortButton,
    { 
      backgroundColor: sortBy === type ? currentTheme.primary : currentTheme.surface,
      borderColor: currentTheme.border
    }
  ];

  const getSortButtonTextStyle = (type) => [
    styles.sortButtonText,
    { 
      color: sortBy === type ? currentTheme.secondary : currentTheme.text
    }
  ];

  const getRankDisplay = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={[styles.loadingText, { color: currentTheme.text }]}>Loading leaderboard...</Text>
      </SafeAreaView>
    );
  }

  if (!userProfile?.teamId) {
    return (
      <View style={[styles.noTeamContainer, { backgroundColor: currentTheme.background }]}>
        <MaterialIcons name="leaderboard" size={64} color={currentTheme.textSecondary} />
        <Text style={[styles.noTeamTitle, { color: currentTheme.text }]}>No Team</Text>
        <Text style={[styles.noTeamSubtitle, { color: currentTheme.textSecondary }]}>Join a team to view the leaderboard</Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: currentTheme.primary }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: currentTheme.secondary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>Leaderboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={[styles.content, { backgroundColor: currentTheme.background }]}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={currentTheme.primary}
            colors={[currentTheme.primary]}
          />
        }
      >
        {/* Sort Options - Only show for automatic ranking mode */}
        {teamData?.rankingMode !== 'manual' && (
          <View style={[styles.sortContainer, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sortHeader}>
              <Text style={[styles.sortLabel, { color: currentTheme.text }]}>Sort by:</Text>
              {sortBy === 'ruleBasedScore' && (
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={() => setShowExplanation(!showExplanation)}
                >
                  <MaterialIcons name="info-outline" size={20} color={currentTheme.primary} />
                  <Text style={[styles.infoButtonText, { color: currentTheme.primary }]}>How it works</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.sortButtons}>
                <TouchableOpacity
                  style={getSortButtonStyle('ruleBasedScore')}
                  onPress={() => setSortBy('ruleBasedScore')}
                >
                  <Text style={getSortButtonTextStyle('ruleBasedScore')}>
                    🎯 Smart Score
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={getSortButtonStyle('totalWorkouts')}
                  onPress={() => setSortBy('totalWorkouts')}
                >
                  <Text style={getSortButtonTextStyle('totalWorkouts')}>
                    Total Workouts
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={getSortButtonStyle('thisWeekWorkouts')}
                  onPress={() => setSortBy('thisWeekWorkouts')}
                >
                  <Text style={getSortButtonTextStyle('thisWeekWorkouts')}>
                    This Week
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={getSortButtonStyle('totalMinutes')}
                  onPress={() => setSortBy('totalMinutes')}
                >
                  <Text style={getSortButtonTextStyle('totalMinutes')}>
                    Total Minutes
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Scoring Explanation Panel */}
        {showExplanation && sortBy === 'ruleBasedScore' && (
          <View style={[styles.explanationPanel, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <View style={styles.explanationHeader}>
              <MaterialIcons name="calculate" size={24} color={currentTheme.primary} />
              <Text style={[styles.explanationTitle, { color: currentTheme.text }]}>Smart Scoring System</Text>
            </View>
            <Text style={[styles.explanationText, { color: currentTheme.textSecondary }]}>
              {getRankingExplanation()}
            </Text>
            <TouchableOpacity
              style={[styles.closeExplanationButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => setShowExplanation(false)}
            >
              <Text style={styles.closeExplanationText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual ranking indicator */}
        {teamData?.rankingMode === 'manual' && (
          <View style={[styles.manualRankingIndicator, { backgroundColor: currentTheme.surface, borderColor: currentTheme.border }]}>
            <View style={styles.manualRankingInfo}>
              <MaterialIcons name="reorder" size={20} color={currentTheme.primary} />
              <Text style={[styles.manualRankingText, { color: currentTheme.text }]}>
                Rankings set manually by coach
              </Text>
            </View>
            {userProfile?.role === 'coach' && (
              <TouchableOpacity
                style={[styles.editRankingsButton, { backgroundColor: currentTheme.primaryLight }]}
                onPress={() => {
                  navigation.navigate('ManualRankings', { 
                    teamData,
                    onRankingsUpdated: () => {
                      // This callback will be called when rankings are successfully updated
                      loadLeaderboardData();
                    }
                  });
                }}
              >
                <MaterialIcons name="edit" size={20} color={currentTheme.primary} />
                <Text style={[styles.editRankingsText, { color: currentTheme.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Leaderboard */}
        <View style={styles.leaderboardContainer}>
          {leaderboard.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="assignment" size={48} color={currentTheme.textSecondary} />
              <Text style={styles.emptyTitle}>No Data Yet</Text>
              <Text style={styles.emptySubtitle}>Start logging workouts to see rankings!</Text>
            </View>
          ) : (
            leaderboard.map((player, index) => (
              <TouchableOpacity 
                key={player.id} 
                style={[
                  styles.playerRow,
                  { backgroundColor: currentTheme.surface },
                  player.isCurrentUser && { backgroundColor: currentTheme.primary + '15' },
                  index === 0 && styles.firstPlaceRow
                ]}
                onPress={() => navigation.navigate('PlayerProfile', { player })}
                activeOpacity={0.7}
              >
                <View style={styles.rankContainer}>
                  <Text style={[
                    styles.rank,
                    { color: currentTheme.text },
                    index < 3 && styles.topThreeRank
                  ]}>
                    {getRankDisplay(index)}
                  </Text>
                </View>

                <View style={styles.playerInfo}>
                  <View style={styles.playerNameContainer}>
                    <Text style={[
                      styles.playerName,
                      { color: currentTheme.text },
                      player.isCurrentUser && { color: currentTheme.primary }
                    ]} numberOfLines={1}>
                      {player.name}
                    </Text>
                    {player.isCurrentUser && (
                      <View style={[styles.youBadge, { backgroundColor: currentTheme.primary }]}>
                        <Text style={styles.youText}>YOU</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.statsRow}>
                    {sortBy === 'ruleBasedScore' && player.totalScore !== undefined ? (
                      <View style={styles.smartScoreStats}>
                        <Text style={[styles.statText, { color: currentTheme.textSecondary }]} numberOfLines={1}>
                          🎯 {player.totalScore} pts • {player.workoutCount} workouts
                        </Text>
                        {player.streak > 0 && (
                          <Text style={[styles.streakText, { color: currentTheme.textSecondary }]} numberOfLines={1}>
                            🔥 {player.streak} day streak
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={[styles.statText, { color: currentTheme.textSecondary }]} numberOfLines={1}>
                        {player.totalWorkouts} workouts • {player.totalMinutes} min
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.scoreContainer}>
                  {teamData?.rankingMode === 'manual' ? (
                    <View style={styles.manualScoreDisplay}>
                      <Text style={[
                        styles.score,
                        { color: currentTheme.text },
                        index < 3 && styles.topThreeScore
                      ]}>
                        {player.totalWorkouts}
                      </Text>
                      <Text style={[styles.scoreLabel, { color: currentTheme.textSecondary }]}>workouts</Text>
                    </View>
                  ) : (
                    <View style={styles.autoScoreDisplay}>
                      <Text style={[
                        styles.score,
                        { color: currentTheme.text },
                        index < 3 && styles.topThreeScore
                      ]}>
                        {sortBy === 'ruleBasedScore' && player.totalScore !== undefined ? player.totalScore : ''}
                        {sortBy === 'totalWorkouts' && player.totalWorkouts}
                        {sortBy === 'thisWeekWorkouts' && player.thisWeekWorkouts}
                        {sortBy === 'totalMinutes' && player.totalMinutes}
                      </Text>
                      <Text style={[styles.scoreLabel, { color: currentTheme.textSecondary }]}>
                        {sortBy === 'ruleBasedScore' && 'points'}
                        {sortBy === 'totalWorkouts' && 'workouts'}
                        {sortBy === 'thisWeekWorkouts' && 'this week'}
                        {sortBy === 'totalMinutes' && 'minutes'}
                      </Text>
                    </View>
                  )}
                </View>

                <MaterialIcons 
                  name="chevron-right" 
                  size={20} 
                  color={currentTheme.textSecondary} 
                  style={styles.chevron}
                />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Stats Summary */}
        {leaderboard.length > 0 && (
          <View style={[styles.summaryContainer, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.summaryTitle, { color: currentTheme.text }]}>Team Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: currentTheme.primary }]}>
                  {(() => {
                    const totalWorkouts = leaderboard.reduce((sum, p) => {
                      const workouts = p.totalWorkouts || p.workoutCount || 0;
                      console.log(`📊 Team Summary: ${p.name} has ${workouts} workouts (totalWorkouts: ${p.totalWorkouts}, workoutCount: ${p.workoutCount})`);
                      return sum + workouts;
                    }, 0);
                    console.log(`📊 Team Summary: Total workouts calculated: ${totalWorkouts}`);
                    return totalWorkouts;
                  })()}
                </Text>
                <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>Total Workouts</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: currentTheme.primary }]}>
                  {(() => {
                    const thisWeekTotal = leaderboard.reduce((sum, p) => {
                      const thisWeek = p.thisWeekWorkouts || 0;
                      console.log(`📊 Team Summary: ${p.name} has ${thisWeek} this week workouts`);
                      return sum + thisWeek;
                    }, 0);
                    console.log(`📊 Team Summary: This week total: ${thisWeekTotal}`);
                    return thisWeekTotal;
                  })()}
                </Text>
                <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>This Week</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: currentTheme.primary }]}>
                  {(() => {
                    const totalMinutes = leaderboard.reduce((sum, p) => sum + (p.totalMinutes || 0), 0);
                    const totalHours = Math.round(totalMinutes / 60);
                    console.log(`📊 Team Summary: Total minutes: ${totalMinutes}, Total hours: ${totalHours}`);
                    return totalHours;
                  })()}
                </Text>
                <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>Total Hours</Text>
              </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  noTeamContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noTeamTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333',
  },
  noTeamSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  sortContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  sortButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  sortButtonTextActive: {
    color: 'white',
  },
  leaderboardContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  currentUserRow: {
    backgroundColor: '#f0f8ff',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  firstPlaceRow: {
    backgroundColor: '#fff9e6',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  topThreeRank: {
    fontSize: 24,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flex: 1,
    marginRight: 8,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 6,
  },
  currentUserName: {
    color: '#007AFF',
  },
  youBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  youText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  minutesText: {
    fontSize: 12,
    color: '#999',
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 60,
    marginLeft: 12,
    flexShrink: 0,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  topThreeScore: {
    color: '#007AFF',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  manualRankingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
  },
  manualRankingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  manualRankingText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  editRankingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editRankingsText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  manualScoreDisplay: {
    alignItems: 'center',
  },
  autoScoreDisplay: {
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 8,
  },
  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f8ff',
  },
  infoButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  explanationPanel: {
    backgroundColor: '#f8f9fa',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  closeExplanationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  closeExplanationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  smartScoreStats: {
    flex: 1,
  },
  streakText: {
    fontSize: 12,
    color: '#ff6b35',
    fontWeight: '500',
    marginTop: 2,
  },
});

export default LeaderboardScreen;
