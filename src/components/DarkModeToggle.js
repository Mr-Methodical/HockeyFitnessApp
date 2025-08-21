import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';

const DarkModeToggle = () => {
  const { isDarkMode, toggleDarkMode, currentTheme } = useTheme();

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5',
          borderColor: currentTheme.border || '#E0E0E0'
        }
      ]} 
      onPress={toggleDarkMode}
    >
      <View style={styles.content}>
        <MaterialIcons 
          name={isDarkMode ? 'dark-mode' : 'light-mode'} 
          size={24} 
          color={currentTheme.secondary} 
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: currentTheme.text || '#000' }]}>
            Dark Mode
          </Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary || '#666' }]}>
            {isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
          </Text>
        </View>
        <View style={[
          styles.toggle,
          { 
            backgroundColor: isDarkMode ? currentTheme.secondary : '#E0E0E0'
          }
        ]}>
          <View style={[
            styles.toggleButton,
            {
              backgroundColor: isDarkMode ? currentTheme.primary : '#FFFFFF',
              transform: [{ translateX: isDarkMode ? 20 : 2 }]
            }
          ]} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});

export default DarkModeToggle;
