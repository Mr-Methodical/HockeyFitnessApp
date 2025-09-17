import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { updatePersonalTheme, PERSONAL_THEMES } from '../services/personalTheme';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import CustomPersonalThemeSelector from './CustomPersonalThemeSelector';

const PersonalThemeSelector = ({ visible, onClose }) => {
  const { userProfile, user } = useAuth();
  const { currentTheme, refreshTheme } = useTheme();
  const [updating, setUpdating] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [showCustomSelector, setShowCustomSelector] = useState(false);

  const handleThemeSelect = async (themeKey) => {
    console.log('🎨 Personal theme selected:', themeKey);
    
    if (userProfile?.role !== 'group_member') {
      Alert.alert('Permission Denied', 'Only group members can change personal themes.');
      return;
    }

    // If custom theme is selected, show the custom selector
    if (themeKey === 'custom') {
      console.log('🎨 Opening custom personal theme selector...');
      setShowCustomSelector(true);
      return;
    }

    try {
      setUpdating(true);
      setSelectedTheme(themeKey);
      
      console.log('🎨 About to update personal theme to:', themeKey);
      console.log('🎨 User ID:', user.uid);
      
      await updatePersonalTheme(user.uid, themeKey);
      console.log('🎨 Personal theme update completed, now refreshing...');
      
      await refreshTheme();
      console.log('🎨 Theme refresh completed');
      
      Alert.alert(
        'Theme Updated!', 
        `Your personal theme has been changed to ${PERSONAL_THEMES[themeKey].name}.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error) {
      console.error('Error updating personal theme:', error);
      Alert.alert('Error', 'Failed to update personal theme. Please try again.');
    } finally {
      setUpdating(false);
      setSelectedTheme(null);
    }
  };

  const handleCustomThemeSave = async () => {
    await refreshTheme();
    setShowCustomSelector(false);
  };

  const handleBackToThemes = () => {
    setShowCustomSelector(false);
  };

  // If showing custom selector, render it instead of theme list
  if (showCustomSelector) {
    return (
      <CustomPersonalThemeSelector
        visible={visible}
        onClose={onClose}
        onSave={handleCustomThemeSave}
        onBack={handleBackToThemes}
      />
    );
  }

  const renderThemeOption = (themeKey, theme) => {
    const isSelected = selectedTheme === themeKey;
    // Better current theme detection
    const isCurrent = themeKey === 'custom' 
      ? currentTheme.name === 'Custom' 
      : currentTheme.name === theme.name;
    const isCustom = themeKey === 'custom';
    
    console.log(`🎨 Rendering personal theme option: ${themeKey}, isCustom: ${isCustom}`);
    
    return (
      <TouchableOpacity
        key={themeKey}
        style={[
          styles.themeOption,
          isCurrent && styles.currentTheme
        ]}
        onPress={() => {
          console.log(`🎨 Personal theme option pressed: ${themeKey}`);
          handleThemeSelect(themeKey);
        }}
        disabled={updating}
      >
        <View style={styles.themePreview}>
          {isCustom ? (
            <View style={styles.customIcon}>
              <MaterialIcons name="palette" size={20} color="#666" />
            </View>
          ) : (
            <>
              <View style={[styles.colorCircle, { backgroundColor: theme.primary }]} />
              <View style={[styles.colorCircle, { backgroundColor: theme.secondary }]} />
              <View style={[styles.colorCircle, { backgroundColor: theme.accent }]} />
            </>
          )}
        </View>
        
        <View style={styles.themeInfo}>
          <Text style={styles.themeName}>{theme.name}</Text>
          {isCustom && <Text style={styles.customDescription}>Create your own colors</Text>}
          {isCurrent && <Text style={styles.currentLabel}>Current</Text>}
        </View>
        
        <View style={styles.themeActions}>
          {isSelected && updating ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : isCurrent ? (
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          ) : isCustom ? (
            <MaterialIcons name="arrow-forward-ios" size={20} color="#ccc" />
          ) : (
            <MaterialIcons name="radio-button-unchecked" size={24} color="#ccc" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Personal Theme</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.subtitle}>
          Choose your personal color theme. This will only affect your own view of the app.
        </Text>

        <ScrollView style={styles.themeList} showsVerticalScrollIndicator={false}>
          {Object.entries(PERSONAL_THEMES).map(([key, theme]) => 
            renderThemeOption(key, theme)
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    padding: 20,
    paddingBottom: 10,
  },
  themeList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentTheme: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  themePreview: {
    flexDirection: 'row',
    marginRight: 16,
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  customIcon: {
    width: 68,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  currentLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 2,
  },
  themeActions: {
    width: 30,
    alignItems: 'center',
  },
});

export default PersonalThemeSelector;
