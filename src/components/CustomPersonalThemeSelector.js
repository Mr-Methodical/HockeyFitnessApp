import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { updateCustomPersonalTheme } from '../services/personalTheme';

const CustomPersonalThemeSelector = ({ visible, onClose, onSave, onBack }) => {
  console.log('🎨 CustomPersonalThemeSelector rendered, visible:', visible);
  
  const { user, userProfile } = useAuth();
  const [colors, setColors] = useState({
    primary: '#1E40AF',     // Nice blue
    secondary: '#FFFFFF',   // White background
    accent: '#DC2626',      // Red accent
  });
  const [loading, setLoading] = useState(false);

  const colorOptions = [
    { name: 'Color 1 (Primary)', key: 'primary', description: 'Main header and button color' },
    { name: 'Color 2 (Background)', key: 'secondary', description: 'Background and secondary elements' },
    { name: 'Color 3 (Accent)', key: 'accent', description: 'Highlights and accents' },
  ];

  const presetColors = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FF8000', '#8000FF', '#0080FF', '#FF0080', '#80FF00', '#FF8080',
    '#000000', '#FFFFFF', '#808080', '#C0C0C0', '#800000', '#008000',
    '#000080', '#800080', '#008080', '#808000', '#004000', '#400080',
  ];

  const validateColor = (color) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  const handleColorChange = (colorKey, value) => {
    // Ensure the value starts with #
    if (!value.startsWith('#')) {
      value = '#' + value;
    }
    setColors(prev => ({ ...prev, [colorKey]: value }));
  };

  const handleSave = async () => {
    console.log('🎨 Attempting to save custom personal theme...');
    console.log('🎨 User:', user?.uid);
    console.log('🎨 UserProfile:', userProfile);
    
    // Validate all colors
    const invalidColors = Object.entries(colors).filter(([key, color]) => !validateColor(color));
    if (invalidColors.length > 0) {
      Alert.alert(
        'Invalid Colors',
        `Please enter valid hex colors for: ${invalidColors.map(([key]) => key).join(', ')}`
      );
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not found. Please try logging in again.');
      return;
    }

    // Group members can customize their own theme
    if (userProfile?.role !== 'group_member') {
      Alert.alert('Permission Denied', 'Only group members can customize personal themes.');
      return;
    }

    setLoading(true);
    try {
      console.log('🎨 Saving custom personal theme for user:', user.uid);
      await updateCustomPersonalTheme(user.uid, {
        name: 'Custom',
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        gradient: [colors.primary, colors.secondary]
      });
      onSave();
      Alert.alert('Success', 'Personal theme saved successfully!', [
        { text: 'OK', onPress: onClose }
      ]);
    } catch (error) {
      console.error('Error saving custom personal theme:', error);
      Alert.alert('Error', 'Failed to save personal theme');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack || onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>{onBack ? 'Back' : 'Cancel'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>My Personal Colors</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, loading && styles.disabledButton]}
            disabled={loading}
          >
            <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {colorOptions.map(({ name, key, description }) => (
            <View key={key} style={styles.colorSection}>
              <Text style={styles.colorLabel}>{name}</Text>
              <Text style={styles.colorDescription}>{description}</Text>
              
              <View style={styles.colorInputContainer}>
                <View 
                  style={[
                    styles.colorPreview, 
                    { backgroundColor: colors[key] },
                    !validateColor(colors[key]) && styles.invalidColor
                  ]} 
                />
                <TextInput
                  style={styles.colorInput}
                  value={colors[key]}
                  onChangeText={(value) => handleColorChange(key, value)}
                  placeholder="#000000"
                  maxLength={7}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.presetColors}>
                {presetColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.presetColor, { backgroundColor: color }]}
                    onPress={() => setColors(prev => ({ ...prev, [key]: color }))}
                  />
                ))}
              </View>
            </View>
          ))}

          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Theme Preview</Text>
            <View style={[styles.previewContainer, { backgroundColor: colors.secondary }]}>
              <View style={[styles.previewHeader, { backgroundColor: colors.primary }]}>
                <Text style={[styles.previewHeaderText, { color: colors.secondary }]}>
                  My Dashboard
                </Text>
              </View>
              <View style={styles.previewContent}>
                <Text style={[styles.previewText, { color: colors.primary }]}>
                  Sample content with primary color
                </Text>
                <TouchableOpacity style={[styles.previewButton, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.previewButtonText, { color: colors.secondary }]}>
                    Action Button
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    padding: 10,
  },
  cancelText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  colorSection: {
    marginBottom: 30,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  colorDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#E1E1E1',
  },
  invalidColor: {
    borderColor: '#FF0000',
  },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  presetColors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetColor: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  previewSection: {
    marginTop: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  previewHeader: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  previewHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  previewContent: {
    padding: 20,
  },
  previewText: {
    fontSize: 16,
    marginBottom: 15,
  },
  previewButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomPersonalThemeSelector;
