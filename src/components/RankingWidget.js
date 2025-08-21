import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { 
  generateAutomaticRankings, 
  getPlayerScoreBreakdown 
} from '../services/ruleBasedRanking';
import { getTeamWorkouts } from '../services/team';

const RankingWidget = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [ranking, setRanking] = useState(null);
  const [playerScore, setPlayerScore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.teamId && userProfile?.role === 'player') {
      loadRankingData();
    } else {
      setLoading(false);
    }
  }, [userProfile]);

  const loadRankingData = async () => {
    try {
      // Get current rankings
      const rankedPlayers = await generateAutomaticRankings(userProfile.teamId);
      
      // Find current user's ranking
      const userRankIndex = rankedPlayers.findIndex(player => player.id === user.uid);
      const userRank = userRankIndex !== -1 ? userRankIndex + 1 : null;
      
      // Get user's detailed score breakdown
      const playerWorkouts = await getTeamWorkouts(userProfile.teamId);
      const userWorkouts = playerWorkouts.filter(workout => workout.userId === user.uid);
      const scoreBreakdown = getPlayerScoreBreakdown(userProfile, userWorkouts);
      
      setRanking({
        position: userRank,
        totalPlayers: rankedPlayers.length,
        isTopThree: userRank && userRank <= 3
      });
      
      setPlayerScore(scoreBreakdown);
      
    } catch (error) {
      console.error('Error loading ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (position) => {
    if (!position) return '?';
    if (position === 1) return '🥇';
    if (position === 2) return '🥈'; 
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const getRankColor = (position) => {
    if (!position) return '#666';
    if (position === 1) return '#FFD700';
    if (position === 2) return '#C0C0C0';
    if (position === 3) return '#CD7F32';
    return '#007AFF';
  };

  if (!userProfile?.teamId || userProfile?.role !== 'player') {
    return null; // Don't show for coaches or users without teams
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading ranking...</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => navigation.navigate('Leaderboard')}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <MaterialIcons name="leaderboard" size={24} color="#007AFF" />
        <Text style={styles.title}>My Ranking</Text>
        <MaterialIcons name="chevron-right" size={20} color="#ccc" />
      </View>
      
      <View style={styles.content}>
        <View style={styles.rankSection}>
          <Text style={[styles.rankDisplay, { color: getRankColor(ranking?.position) }]}>
            {getRankDisplay(ranking?.position)}
          </Text>
          <View style={styles.rankInfo}>
            <Text style={styles.rankText}>
              {ranking?.position ? `${ranking.position} of ${ranking.totalPlayers}` : 'Unranked'}
            </Text>
            {ranking?.isTopThree && (
              <Text style={styles.topThreeText}>🎉 Top 3!</Text>
            )}
          </View>
        </View>
        
        {playerScore && (
          <View style={styles.scoreSection}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{playerScore.totalScore}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
            {playerScore.streak > 0 && (
              <View style={styles.scoreItem}>
                <Text style={styles.streakValue}>🔥 {playerScore.streak}</Text>
                <Text style={styles.scoreLabel}>Streak</Text>
              </View>
            )}
            <View style={styles.scoreItem}>
              <Text style={styles.scoreValue}>{playerScore.workoutCount}</Text>
              <Text style={styles.scoreLabel}>Workouts</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankDisplay: {
    fontSize: 36,
    fontWeight: 'bold',
    marginRight: 12,
  },
  rankInfo: {
    flex: 1,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  topThreeText: {
    fontSize: 12,
    color: '#ff6b35',
    fontWeight: '500',
    marginTop: 2,
  },
  scoreSection: {
    flexDirection: 'row',
    gap: 16,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  streakValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default RankingWidget;
