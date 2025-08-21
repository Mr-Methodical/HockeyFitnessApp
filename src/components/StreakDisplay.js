import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

const StreakDisplay = ({ currentStreak, longestStreak = null, size = 'medium', fullWidth = false }) => {
  const { currentTheme, isDarkMode } = useTheme();
  
  const getStreakColor = (streak) => {
    if (streak === 0) return '#999';
    if (streak < 3) return '#4ECDC4';
    if (streak < 7) return '#FF6B35';
    if (streak < 14) return '#FF8500';
    if (streak < 30) return '#FFB700';
    if (streak < 50) return '#FFD700';
    return '#9D4EDD';
  };

  const getStreakEmoji = (streak) => {
    if (streak === 0) return '😴';
    if (streak < 3) return '🔥';
    if (streak < 7) return '💪';
    if (streak < 14) return '⚡';
    if (streak < 30) return '🏆';
    if (streak < 50) return '💎';
    return '👑';
  };

  const getStreakMessage = (streak) => {
    if (streak === 0) return 'Start your streak!';
    if (streak === 1) return 'Great start!';
    if (streak < 3) return 'Keep it going!';
    if (streak < 7) return 'On fire!';
    if (streak < 14) return 'Unstoppable!';
    if (streak < 30) return 'Amazing streak!';
    if (streak < 50) return 'Legendary!';
    return 'GOAT Status!';
  };

  const sizeStyles = {
    small: {
      container: { padding: 12 },
      emoji: { fontSize: 24 },
      number: { fontSize: 24 },
      label: { fontSize: 12 },
      message: { fontSize: 10 }
    },
    medium: {
      container: { padding: 16 },
      emoji: { fontSize: 32 },
      number: { fontSize: 32 },
      label: { fontSize: 14 },
      message: { fontSize: 12 }
    },
    large: {
      container: { padding: 20 },
      emoji: { fontSize: 40 },
      number: { fontSize: 40 },
      label: { fontSize: 16 },
      message: { fontSize: 14 }
    }
  };

  const currentSize = sizeStyles[size];
  const streakColor = getStreakColor(currentStreak);

  return (
    <View style={[
      styles.container, 
      currentSize.container,
      fullWidth && { width: '100%', alignSelf: 'stretch' },
      { 
        backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
        borderColor: streakColor,
        borderWidth: 2
      }
    ]}>
      <Text style={[styles.emoji, currentSize.emoji]}>
        {getStreakEmoji(currentStreak)}
      </Text>
      
      <View style={styles.streakInfo}>
        <Text style={[
          styles.streakNumber, 
          currentSize.number,
          { color: streakColor }
        ]}>
          {currentStreak}
        </Text>
        <Text style={[
          styles.streakLabel, 
          currentSize.label,
          { color: isDarkMode ? '#FFF' : '#333' }
        ]}>
          day streak
        </Text>
      </View>
      
      <Text style={[
        styles.streakMessage, 
        currentSize.message,
        { color: isDarkMode ? '#CCC' : '#666' }
      ]}>
        {getStreakMessage(currentStreak)}
      </Text>
      
      {longestStreak !== null && longestStreak > currentStreak && (
        <Text style={[
          styles.longestStreak, 
          { 
            fontSize: currentSize.message.fontSize,
            color: isDarkMode ? '#999' : '#888'
          }
        ]}>
          Best: {longestStreak} days
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emoji: {
    marginBottom: 8,
  },
  streakInfo: {
    alignItems: 'center',
    marginBottom: 4,
  },
  streakNumber: {
    fontWeight: 'bold',
    lineHeight: 32,
  },
  streakLabel: {
    fontWeight: '600',
    marginTop: -4,
  },
  streakMessage: {
    fontWeight: '500',
    textAlign: 'center',
  },
  longestStreak: {
    marginTop: 4,
    fontStyle: 'italic',
  }
});

export default StreakDisplay;
