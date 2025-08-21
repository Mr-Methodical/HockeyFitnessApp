import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../utils/AuthContext';
import { logWorkout, getTeam } from '../services/team';
import { checkAndAwardBadges } from '../services/badges';
import BadgeNotification from '../components/BadgeNotification';

const LogWorkoutScreen = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [team, setTeam] = useState(null);
  const [workoutType, setWorkoutType] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newBadgeNotification, setNewBadgeNotification] = useState(null);

  const workoutTypes = [
    'Cardio', 'Strength Training', 'Skating', 'Stick Handling',
    'Shooting Practice', 'Conditioning', 'Flexibility', 'AI Workout', 'Other'
  ];

  // Load team data to check image requirements
  useEffect(() => {
    const loadTeamData = async () => {
      if (userProfile?.teamId) {
        try {
          const teamData = await getTeam(userProfile.teamId);
          setTeam(teamData);
        } catch (error) {
          console.error('Error loading team data:', error);
        }
      }
    };

    loadTeamData();
  }, [userProfile?.teamId]);

  const pickImage = async () => {
    try {
      console.log('📱 Starting photo library picker...');
      
      // Request permission first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📱 Media library permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need photo library permissions to select images!');
        return;
      }

      console.log('📱 Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      console.log('📱 Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0]);
        console.log('📷 Image selected:', result.assets[0].uri);
      } else {
        console.log('📱 Image picker was canceled or no assets returned');
      }
    } catch (error) {
      console.error('📱 Image picker error:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message}`);
    }
  };

  const takePhoto = async () => {
    try {
      console.log('📱 Starting camera...');
      
      // Request camera permission first
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('📱 Camera permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera permissions to take photos!');
        return;
      }

      console.log('📱 Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📱 Camera result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0]);
        console.log('📷 Photo taken:', result.assets[0].uri);
      } else {
        console.log('📱 Camera was canceled or no assets returned');
      }
    } catch (error) {
      console.error('📱 Camera error:', error);
      Alert.alert('Error', `Failed to take photo: ${error.message}`);
    }
  };

  const requestAllPermissions = async () => {
    try {
      console.log('📱 Requesting all permissions...');
      
      // Request both permissions at once
      const [mediaResult, cameraResult] = await Promise.all([
        ImagePicker.requestMediaLibraryPermissionsAsync(),
        ImagePicker.requestCameraPermissionsAsync()
      ]);
      
      console.log('📱 Media library permission result:', mediaResult);
      console.log('📱 Camera permission result:', cameraResult);
      
      if (mediaResult.granted && cameraResult.granted) {
        Alert.alert('Success!', 'All permissions granted. You can now use both camera and photo library.');
      } else {
        Alert.alert(
          'Permissions Needed', 
          `Please grant permissions in Settings:\n• Media Library: ${mediaResult.granted ? 'Granted ✓' : 'Denied ✗'}\n• Camera: ${cameraResult.granted ? 'Granted ✓' : 'Denied ✗'}`
        );
      }
      
      return { mediaLibrary: mediaResult.granted, camera: cameraResult.granted };
    } catch (error) {
      console.error('📱 Permission request error:', error);
      Alert.alert('Error', `Failed to request permissions: ${error.message}`);
      return { mediaLibrary: false, camera: false };
    }
  };

  const checkPermissions = async () => {
    try {
      console.log('📱 Checking permissions...');
      
      // Check media library permission
      const mediaLibraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log('📱 Media library current status:', mediaLibraryStatus);
      
      // Check camera permission
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      console.log('📱 Camera current status:', cameraStatus);
      
      return {
        mediaLibrary: mediaLibraryStatus.granted,
        camera: cameraStatus.granted
      };
    } catch (error) {
      console.error('📱 Permission check error:', error);
      return { mediaLibrary: false, camera: false };
    }
  };

  const showImageOptions = async () => {
    console.log('📷 Showing image picker options...');
    
    // Check current permissions
    const permissions = await checkPermissions();
    console.log('📱 Current permissions:', permissions);
    
    const options = [
      { 
        text: `Camera ${permissions.camera ? '✓' : '(needs permission)'}`, 
        onPress: () => {
          console.log('📷 User selected camera');
          takePhoto();
        }
      },
      { 
        text: `Photo Library ${permissions.mediaLibrary ? '✓' : '(needs permission)'}`, 
        onPress: () => {
          console.log('📷 User selected photo library');
          pickImage();
        }
      }
    ];

    // Add permission request option if needed
    if (!permissions.mediaLibrary || !permissions.camera) {
      options.unshift({
        text: '🔓 Request Permissions',
        onPress: () => {
          console.log('📱 User requested permissions');
          requestAllPermissions();
        }
      });
    }

    options.push({ 
      text: 'Cancel', 
      style: 'cancel', 
      onPress: () => {
        console.log('📷 User cancelled image picker');
      }
    });
    
    Alert.alert('Add Photo', 'Choose an option', options);
  };

  const handleSubmit = async () => {
    if (!workoutType || !duration) {
      Alert.alert('Error', 'Please fill in workout type and duration');
      return;
    }

    if (!userProfile?.teamId) {
      Alert.alert('Error', 'You must be part of a team to log workouts');
      return;
    }

    // Check if image is required by team settings
    if (team?.imageRequired && !image) {
      Alert.alert(
        'Image Required', 
        'Your coach requires an image to be included with every workout. Please add a photo before submitting.'
      );
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Error', 'Please enter a valid duration in minutes');
      return;
    }

    setLoading(true);
    try {
      console.log('🏒 Starting workout submission...');
      console.log('📊 Workout data:', {
        type: workoutType,
        duration: durationNum,
        notes: notes.trim(),
        hasImage: !!image?.uri,
        userId: user.uid,
        teamId: userProfile.teamId
      });
      
      await logWorkout(
        {
          type: workoutType,
          duration: durationNum,
          notes: notes.trim()
        },
        user.uid,
        userProfile.teamId,
        image?.uri
      );

      console.log('✅ Workout submission completed successfully');

      // Check for new badges
      try {
        const newBadges = await checkAndAwardBadges(user.uid);
        if (newBadges.length > 0) {
          setNewBadgeNotification(newBadges[0]);
        }
      } catch (error) {
        console.error('Error checking badges:', error);
      }

      Alert.alert(
        'Success!',
        'Workout logged successfully',
        [{ 
          text: 'OK', 
          onPress: () => {
            // Navigate back to previous screen
            navigation.goBack();
          }
        }]
      );
    } catch (error) {
      console.error('Error logging workout:', error);
      Alert.alert(
        'Error',
        `Failed to log workout. Please try again.\n\nDetails: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BadgeNotification 
        badge={newBadgeNotification}
        visible={!!newBadgeNotification}
        onHide={() => setNewBadgeNotification(null)}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Workout</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Workout Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Workout Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.typeContainer}>
                {workoutTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      workoutType === type && styles.typeButtonSelected
                    ]}
                    onPress={() => setWorkoutType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      workoutType === type && styles.typeButtonTextSelected
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={styles.label}>Duration (minutes) *</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 30"
              keyboardType="numeric"
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go? Any achievements or challenges?"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Photo */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Photo {team?.imageRequired ? '(required)' : '(optional)'}
            </Text>
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image.uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImage(null)}
                >
                  <MaterialIcons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addPhotoButton} onPress={showImageOptions}>
                <MaterialIcons name="add-a-photo" size={32} color="#007AFF" />
                <Text style={styles.addPhotoText}>
                  {team?.imageRequired ? 'Add Photo (Required)' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Logging Workout...' : 'Log Workout'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  typeButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  typeButtonTextSelected: {
    color: 'white',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  notesInput: {
    height: 100,
    paddingTop: 15,
  },
  addPhotoButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default LogWorkoutScreen;
