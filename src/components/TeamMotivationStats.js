import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { calculateCurrentStreak, getUserBadges } from '../services/badges';

const TeamMotivationStats = ({ teamMembers, navigation }) => {
  const { currentTheme, isDarkMode } = useTheme();
  const [memberStats, setMemberStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemberStats();
  }, [teamMembers]);

  const loadMemberStats = async () => {
    if (!teamMembers || teamMembers.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const stats = await Promise.all(
        teamMembers
          .filter(member => member && member.role === 'player' && member.id)
          .map(async (member) => {
            try {
              const [streak, badges] = await Promise.all([
                calculateCurrentStreak(member.id),
                getUserBadges(member.id)
              ]);
              
              return {
                ...member,
                name: member.name || 'Unknown Player', // Ensure name is always present
                currentStreak: streak,
                badgeCount: badges.length,
                recentBadges: badges.slice(-3)
              };
            } catch (error) {
              console.error(`Error loading stats for member ${member.id}:`, error);
              return {
                ...member,
                name: member.name || 'Unknown Player',
                currentStreak: 0,
                badgeCount: 0,
                recentBadges: []
              };
            }
          })
      );

      // Sort by streak descending, then by badge count
      stats.sort((a, b) => {
        if (b.currentStreak !== a.currentStreak) {
          return b.currentStreak - a.currentStreak;
        }
        return b.badgeCount - a.badgeCount;
      });

      setMemberStats(stats);
    } catch (error) {
      console.error('Error loading member stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStreakEmoji = (streak) => {
    if (streak === 0) return '😴';
    if (streak < 3) return '🔥';
    if (streak < 7) return '💪';
    if (streak < 14) return '⚡';
    return '🏆';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
        <Text style={[styles.title, { color: isDarkMode ? '#FFF' : '#333' }]}>
          Loading team stats...
        </Text>
      </View>
    );
  }

  if (memberStats.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
        <Text style={[styles.title, { color: isDarkMode ? '#FFF' : '#333' }]}>
          Team Motivation
        </Text>
        <Text style={[styles.emptyText, { color: isDarkMode ? '#CCC' : '#666' }]}>
          No players in team yet
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDarkMode ? '#FFF' : '#333' }]}>
          Team Motivation 🚀
        </Text>
        <Text style={[styles.subtitle, { color: isDarkMode ? '#CCC' : '#666' }]}>
          Streaks & Achievements
        </Text>
      </View>

      <ScrollView style={styles.statsList} showsVerticalScrollIndicator={false}>
        {memberStats.map((member, index) => (
          <View key={member.id} style={[
            styles.memberRow,
            { borderBottomColor: isDarkMode ? '#333' : '#E5E5E5' }
          ]}>
            <View style={styles.rankContainer}>
              <Text style={[styles.rank, { color: currentTheme.primary }]}>
                #{index + 1}
              </Text>
            </View>
            
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: isDarkMode ? '#FFF' : '#333' }]}>
                {member?.name || 'Unknown Player'}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.streakEmoji}>
                    {getStreakEmoji(member.currentStreak)}
                  </Text>
                  <Text style={[styles.statText, { color: isDarkMode ? '#CCC' : '#666' }]}>
                    {member.currentStreak} day streak
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons 
                    name="emoji-events" 
                    size={16} 
                    color={currentTheme.secondary} 
                  />
                  <Text style={[styles.statText, { color: isDarkMode ? '#CCC' : '#666' }]}>
                    {member.badgeCount} badges
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.viewButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => navigation.navigate('PlayerProfile', { player: member })}
            >
              <MaterialIcons name="chevron-right" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Top performers summary */}
      <View style={[styles.summary, { borderTopColor: isDarkMode ? '#333' : '#E5E5E5' }]}>
        <Text style={[styles.summaryText, { color: isDarkMode ? '#CCC' : '#666' }]}>
          🏆 Top streak: {memberStats[0]?.currentStreak || 0} days by {memberStats[0]?.name || 'Unknown'}
        </Text>
        <Text style={[styles.summaryText, { color: isDarkMode ? '#CCC' : '#666' }]}>
          🏅 Most badges: {Math.max(...memberStats.map(m => m.badgeCount), 0)} earned
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  statsList: {
    maxHeight: 200,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakEmoji: {
    fontSize: 14,
  },
  statText: {
    fontSize: 12,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  summaryText: {
    fontSize: 12,
    marginBottom: 2,
  }
});

export default TeamMotivationStats;
