import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
// import { useFocusEffect } from '@react-navigation/native'; // TEMPORARILY DISABLED TO FIX INFINITE LOOP
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { generateWorkout, generateWorkoutImage, saveAIWorkout, getWorkoutSuggestions } from '../services/aiWorkout';
import { generateWorkout as generateWorkoutFast, generateWorkoutInstant } from '../services/fastAiWorkout';
import { generateGroupMemberWorkout, generateGroupMemberWorkoutInstant } from '../services/groupMemberWorkout';
import { generateWorkoutImageFast, generateImageInBackground } from '../services/fastImageGeneration';
import { getTeam } from '../services/team';
import { useAuth } from '../utils/AuthContext';
import { checkAndAwardBadges } from '../services/badges';

const PreferencesModalComponent = React.memo(({
  visible,
  onClose,
  preferences,
  onUpdatePreference,
  customWorkoutText,
  onCustomTextChange,
  loading,
  onGenerateWorkout,
  userProfile,
  styles
}) => {
  const baseFocusOptions = [
    'cardio endurance', 
    'strength training', 
    'flexibility/mobility',
    'speed and agility'
  ];
  const focusOptions = userProfile?.role === 'group_member' 
    ? baseFocusOptions 
    : ['hockey-specific', ...baseFocusOptions];

  return (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
  >
    <SafeAreaView style={styles.modalContainer}>
      <KeyboardAvoidingView 
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalInnerContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Workout Preferences</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
        {/* Duration Preference */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>Duration</Text>
          {['15-20 minutes', '30-45 minutes', '45-60 minutes', '60+ minutes'].map((duration) => (
            <TouchableOpacity
              key={duration}
              style={[
                styles.preferenceOption,
                preferences.duration === duration && styles.preferenceOptionSelected
              ]}
              onPress={() => onUpdatePreference('duration', duration)}
            >
              <Text style={[
                styles.preferenceOptionText,
                preferences.duration === duration && styles.preferenceOptionTextSelected
              ]}>
                {duration}
              </Text>
              {preferences.duration === duration && (
                <Ionicons name="checkmark" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Focus Preference */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>Focus</Text>
          {focusOptions.map((focus) => (
            <TouchableOpacity
              key={focus}
              style={[
                styles.preferenceOption,
                preferences.focus === focus && styles.preferenceOptionSelected
              ]}
              onPress={() => onUpdatePreference('focus', focus)}
            >
              <Text style={[
                styles.preferenceOptionText,
                preferences.focus === focus && styles.preferenceOptionTextSelected
              ]}>
                {focus.charAt(0).toUpperCase() + focus.slice(1)}
              </Text>
              {preferences.focus === focus && (
                <Ionicons name="checkmark" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Equipment Preference */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>Equipment</Text>
          {[
            'no equipment', 
            'minimal equipment', 
            'full gym access', 
            'home gym setup'
          ].map((equipment) => (
            <TouchableOpacity
              key={equipment}
              style={[
                styles.preferenceOption,
                preferences.equipment === equipment && styles.preferenceOptionSelected
              ]}
              onPress={() => onUpdatePreference('equipment', equipment)}
            >
              <Text style={[
                styles.preferenceOptionText,
                preferences.equipment === equipment && styles.preferenceOptionTextSelected
              ]}>
                {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
              </Text>
              {preferences.equipment === equipment && (
                <Ionicons name="checkmark" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Fitness Level Preference */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>Fitness Level</Text>
          {['beginner', 'intermediate', 'advanced', 'elite'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.preferenceOption,
                preferences.fitnessLevel === level && styles.preferenceOptionSelected
              ]}
              onPress={() => onUpdatePreference('fitnessLevel', level)}
            >
              <Text style={[
                styles.preferenceOptionText,
                preferences.fitnessLevel === level && styles.preferenceOptionTextSelected
              ]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
              {preferences.fitnessLevel === level && (
                <Ionicons name="checkmark" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Generation Speed Preference */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>Generation Speed</Text>
          <Text style={styles.preferenceSectionSubtitle}>
            Choose between speed and detail level. All options create effective workouts!
          </Text>
          {[
            { key: 'instant', label: 'Instant (1-3 sec)', desc: 'Template-based, very fast' },
            { key: 'fast', label: 'Fast (5-15 sec)', desc: 'AI-generated, optimized' },
            { key: 'detailed', label: 'Detailed (15-30 sec)', desc: 'Comprehensive AI workout' }
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.preferenceOption,
                preferences.speed === option.key && styles.preferenceOptionSelected
              ]}
              onPress={() => onUpdatePreference('speed', option.key)}
            >
              <View style={styles.speedOptionContent}>
                <Text style={[
                  styles.preferenceOptionText,
                  preferences.speed === option.key && styles.preferenceOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.speedOptionDesc,
                  preferences.speed === option.key && styles.speedOptionDescSelected
                ]}>
                  {option.desc}
                </Text>
              </View>
              {preferences.speed === option.key && (
                <Ionicons name="checkmark" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Specifications */}
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceSectionTitle}>Additional Specifications</Text>
          <Text style={styles.preferenceSectionSubtitle}>
            Add any specific requirements, exercises you want to include/exclude, or training goals (max 500 characters)
          </Text>
          <TouchableWithoutFeedback onPress={() => {}}>
            <TextInput
              style={[
                styles.customTextInput,
                customWorkoutText.length > 500 && styles.customTextInputError
              ]}
              placeholder="e.g., Focus on leg strength, include plyometrics, no jumping exercises..."
              multiline={true}
              numberOfLines={4}
              value={customWorkoutText}
              onChangeText={onCustomTextChange}
              textAlignVertical="top"
              returnKeyType="done"
              blurOnSubmit={true}
              maxLength={500}
            />
          </TouchableWithoutFeedback>
          <View style={styles.characterCountContainer}>
            <Text style={[
              styles.characterCount,
              customWorkoutText.length > 500 && styles.characterCountError
            ]}>
              {customWorkoutText.length}/500 characters
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.generateButton}
              onPress={onGenerateWorkout}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.savingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.generateButtonText}>Generating...</Text>
                </View>
              ) : (
                <Text style={styles.generateButtonText}>Generate Custom Workout</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>
  );
});

const AIWorkoutScreen = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const [team, setTeam] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [customWorkoutText, setCustomWorkoutText] = useState('');
  const [isQuickStartMode, setIsQuickStartMode] = useState(false); // Track if user clicked quick start
  const hasLeftScreenRef = useRef(false); // Use ref instead of state to avoid infinite loops
  
  // Get suggested preferences from route params (if navigated from another workout)
  const suggestedPreferences = route?.params?.suggestedPreferences;
  const sourceWorkout = route?.params?.sourceWorkout;
  
  const [preferences, setPreferences] = useState({
    duration: suggestedPreferences?.duration || '30-45 minutes',
    focus: suggestedPreferences?.focus || 'cardio endurance', // Default to general focus initially
    equipment: suggestedPreferences?.equipment || 'minimal equipment',
    fitnessLevel: suggestedPreferences?.fitnessLevel || 'intermediate',
    speed: 'fast', // Workout generation speed option
    imageSpeed: 'fast' // New: image generation speed option
  });

  useEffect(() => {
    loadSuggestions();
    requestImagePermissions();
    loadTeamData();
    
    // Auto-generate workout if we have suggested preferences (from "Generate Similar Workout")
    if (suggestedPreferences && !workout) {
      console.log('Auto-generating workout with suggested preferences:', suggestedPreferences);
      generateNewWorkout(preferences);
    }
  }, []);

  // Set correct default focus based on user role when userProfile loads
  useEffect(() => {
    if (userProfile && !suggestedPreferences?.focus) {
      const defaultFocus = userProfile.role === 'group_member' ? 'cardio endurance' : 'hockey-specific';
      setPreferences(prev => ({
        ...prev,
        focus: defaultFocus
      }));
    }
  }, [userProfile]);

  // Debug: Log workout state changes
  useEffect(() => {
    console.log('💾 Workout state changed:', workout ? 'Has workout' : 'No workout');
    if (workout) {
      console.log('💾 Workout title:', workout.title);
    }
  }, [workout]);

  // Track when user leaves and returns to AI Trainer screen
  // TEMPORARILY DISABLED TO FIX INFINITE LOOP
  /*
  useFocusEffect(
    useCallback(() => {
      // When screen gains focus
      console.log('🎯 AI Trainer gained focus. Has left screen before:', hasLeftScreenRef.current);
      
      // Only reset if user has left the screen before AND we're not in quick start mode
      if (hasLeftScreenRef.current && !isQuickStartMode) {
        console.log('🔄 User returned from another tab/screen - resetting to default');
        setWorkout(null);
        setSelectedImage(null);
        setWorkoutStartTime(null);
        hasLeftScreenRef.current = false; // Reset the flag
      }
      
      // Return cleanup function that runs when screen loses focus
      return () => {
        console.log('👋 AI Trainer lost focus - marking as left screen');
        hasLeftScreenRef.current = true;
      };
    }, [isQuickStartMode]) // Only depend on isQuickStartMode, not hasLeftScreen
  );
  */

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

  const requestImagePermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.log('Image picker permissions not granted');
    }
  };

  const selectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5, // Reduced quality for better upload reliability
        base64: false, // Don't generate base64 to reduce memory usage
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📸 Image selected:', imageUri?.substring(0, 50) + '...');
        console.log('📸 Image size info:', {
          width: result.assets[0].width,
          height: result.assets[0].height,
          fileSize: result.assets[0].fileSize
        });
        setSelectedImage(imageUri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5, // Reduced quality for better upload reliability
        base64: false, // Don't generate base64 to reduce memory usage
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📸 Photo taken:', imageUri?.substring(0, 50) + '...');
        console.log('📸 Photo size info:', {
          width: result.assets[0].width,
          height: result.assets[0].height,
          fileSize: result.assets[0].fileSize
        });
        setSelectedImage(imageUri);
        setShowImageOptions(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const loadSuggestions = async () => {
    try {
      const workoutSuggestions = await getWorkoutSuggestions(user.uid, userProfile?.role);
      setSuggestions(workoutSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const generateNewWorkout = async (customPreferences = null) => {
    console.log('🏃‍♂️ Starting workout generation...', { customPreferences, isQuickStartMode });
    setLoading(true);
    try {
      const workoutPrefs = customPreferences || preferences;
      console.log('📝 Using workout preferences:', workoutPrefs);
      
      // Choose generation method based on speed preference
      let generatedWorkout;
      // Use different services based on user role
      if (userProfile?.role === 'group_member') {
        // Use group member specific service (no hockey references)
        switch (workoutPrefs.speed) {
          case 'instant':
            console.log('🚀 Using instant group member generation (1-3 seconds)');
            generatedWorkout = await generateGroupMemberWorkoutInstant(workoutPrefs);
            break;
          case 'fast':
          case 'detailed':
          default:
            console.log('⚡ Using fast group member generation (5-15 seconds)');
            generatedWorkout = await generateGroupMemberWorkout(workoutPrefs);
        }
      } else {
        // Use hockey-specific service for players and coaches
        switch (workoutPrefs.speed) {
          case 'instant':
            console.log('🚀 Using instant hockey generation (1-3 seconds)');
            generatedWorkout = await generateWorkoutInstant(workoutPrefs, userProfile?.role);
            break;
          case 'fast':
            console.log('⚡ Using fast hockey generation (5-15 seconds)');
            generatedWorkout = await generateWorkoutFast(workoutPrefs, userProfile?.role);
            break;
          case 'detailed':
            console.log('🎯 Using detailed hockey generation (15-30 seconds)');
            generatedWorkout = await generateWorkout(workoutPrefs, userProfile?.role);
            break;
          default:
            generatedWorkout = await generateWorkoutFast(workoutPrefs, userProfile?.role);
        }
      }
      
      console.log('✅ Workout generated successfully:', generatedWorkout ? 'Has workout data' : 'No workout data');
      
      // Process workout to add IDs and completed flags to exercises
      if (generatedWorkout) {
        const processedWorkout = {
          ...generatedWorkout,
          warmup: generatedWorkout.warmup?.map((exercise, index) => ({
            ...exercise,
            id: `warmup-${index}`,
            completed: false
          })) || [],
          mainWorkout: generatedWorkout.mainWorkout?.map((exercise, index) => ({
            ...exercise,
            id: `main-${index}`,
            completed: false
          })) || [],
          cooldown: generatedWorkout.cooldown?.map((exercise, index) => ({
            ...exercise,
            id: `cooldown-${index}`,
            completed: false
          })) || []
        };
        setWorkout(processedWorkout);
      } else {
        setWorkout(generatedWorkout);
      }
      
      setWorkoutStartTime(new Date());
      
      // If this was a quick start generation, reset the flag after successful generation
      if (isQuickStartMode) {
        console.log('✅ Quick start workout generated successfully');
        // Reset quick start mode after a delay to allow the workout to render
        setTimeout(() => {
          console.log('🔄 Resetting quick start mode after successful generation');
          setIsQuickStartMode(false);
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Workout generation error:', error);
      Alert.alert('Error', 'Failed to generate workout. Please try again.');
    } finally {
      setLoading(false);
      console.log('🏁 Workout generation completed, loading state cleared');
    }
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const generateCustomWorkout = async () => {
    const customPreferences = {
      ...preferences,
      customSpecifications: customWorkoutText.trim() || null
    };
    await generateNewWorkout(customPreferences);
    setShowPreferences(false);
  };

  const toggleExerciseComplete = (section, exerciseId) => {
    setWorkout(prev => ({
      ...prev,
      [section]: prev[section].map(exercise =>
        exercise.id === exerciseId
          ? { ...exercise, completed: !exercise.completed }
          : exercise
      )
    }));
  };

  const calculateProgress = () => {
    if (!workout) return 0;
    
    const allExercises = [
      ...workout.warmup,
      ...workout.mainWorkout,
      ...workout.cooldown
    ];
    
    const completed = allExercises.filter(ex => ex.completed).length;
    return Math.round((completed / allExercises.length) * 100);
  };

  const completeWorkout = async () => {
    console.log('🎯 Complete workout button pressed');
    if (!workout || !workoutStartTime || saving) {
      console.log('❌ Cannot complete workout:', { hasWorkout: !!workout, hasStartTime: !!workoutStartTime, saving });
      return; // Prevent multiple calls
    }

    console.log('📊 Calculating workout progress...');
    const progress = calculateProgress();
    const isImageRequired = team?.imageRequired || false;
    console.log(`📈 Workout progress: ${progress}%, Image required: ${isImageRequired}`);
    
    if (progress < 50) {
      Alert.alert(
        'Incomplete Workout',
        'You\'ve only completed ' + progress + '% of the workout. Are you sure you want to finish?',
        [
          { text: 'Continue Workout', style: 'cancel' },
          { text: 'Finish Anyway', onPress: () => showImageOptionsForCompletion() }
        ]
      );
      return;
    }

    showImageOptionsForCompletion();
  };

  const showImageOptionsForCompletion = () => {
    const isImageRequired = team?.imageRequired || false;
    
    const alertOptions = [
      {
        text: 'Choose Photo',
        onPress: () => selectImageForCompletion()
      },
      {
        text: 'Take Photo',
        onPress: () => takePhotoForCompletion()
      },
      {
        text: 'AI Generated',
        onPress: () => {
          setSelectedImage(null); // Clear any previous image
          saveWorkoutSession(false, 'generate-ai'); // Explicitly request AI generation
        }
      }
    ];

    // Only add Skip option if images are optional
    if (!isImageRequired) {
      alertOptions.unshift({
        text: 'Skip',
        style: 'cancel',
        onPress: () => saveWorkoutSession(true) // Pass true to indicate no image
      });
    }

    Alert.alert(
      'Add Workout Image',
      isImageRequired 
        ? 'Please add an image to your completed workout (required by your team):'
        : 'Would you like to add an image to your completed workout?',
      alertOptions
    );
  };

  const selectImageForCompletion = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
      saveWorkoutSession(false, result.canceled || !result.assets[0] ? null : result.assets[0].uri); // Pass the selected image
    } catch (error) {
      console.error('Error selecting image for completion:', error);
      saveWorkoutSession(false, null); // Continue without image if there's an error
    }
  };

  const takePhotoForCompletion = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        saveWorkoutSession(true, null); // Continue without image due to permission denial
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
      saveWorkoutSession(false, result.canceled || !result.assets[0] ? null : result.assets[0].uri); // Pass the selected image
    } catch (error) {
      console.error('Error taking photo for completion:', error);
      saveWorkoutSession(false, null); // Continue without image if there's an error
    }
  };

  const saveWorkoutSession = async (skipImage = false, userImageUri = null) => {
    if (saving) return; // Prevent multiple saves
    
    try {
      console.log('💾 Starting workout save process...', { skipImage, userImageUri, preferences: preferences.imageSpeed });
      setSaving(true); // Start loading state
      const endTime = new Date();
      const calculatedTimeMinutes = Math.round((endTime - workoutStartTime) / (1000 * 60));
      
      // Ensure minimum duration of 1 minute for AI workouts
      // If user completes very quickly, use estimated duration or default to reasonable time
      let totalTimeMinutes = calculatedTimeMinutes;
      if (totalTimeMinutes === 0) {
        // Try to extract duration from workout preferences or use default
        const estimatedDuration = workout?.estimatedDuration || preferences?.duration || '30-45 minutes';
        if (estimatedDuration.includes('15-20')) {
          totalTimeMinutes = 15;
        } else if (estimatedDuration.includes('30-45')) {
          totalTimeMinutes = 30;
        } else if (estimatedDuration.includes('45-60')) {
          totalTimeMinutes = 45;
        } else if (estimatedDuration.includes('60+')) {
          totalTimeMinutes = 60;
        } else {
          totalTimeMinutes = 30; // Default fallback
        }
        console.log(`⏱️ Workout completed too quickly (${calculatedTimeMinutes} min), using estimated duration: ${totalTimeMinutes} minutes`);
      } else {
        console.log(`⏱️ Workout duration: ${totalTimeMinutes} minutes`);
      }
      
      // Handle image based on user preference
      let imageToSave = null;
      
      if (skipImage || preferences.imageSpeed === 'none') {
        console.log('🚫 Skipping image generation (user choice)');
        imageToSave = 'no-image'; // Skip image generation completely
      } else if (userImageUri && userImageUri !== 'generate-ai') {
        imageToSave = userImageUri; // Use user-uploaded image
        console.log('📱 Using user-provided image, skipping AI generation');
      } else {
        // Generate AI image (user chose AI Generated or no image was provided)
        console.log(`🖼️ Generating AI image with speed: ${preferences.imageSpeed}`);
        
        try {
          if (preferences.imageSpeed === 'instant') {
            console.log('⚡ Using instant image generation');
            // For instant mode, skip image to save time
            imageToSave = null;
          } else if (preferences.imageSpeed === 'fast') {
            console.log('🚀 Using fast image generation');
            // Use the fast image generation
            imageToSave = await generateWorkoutImageFast(
              workout.title,
              workout.description,
              user.uid,
              'fast',
              userProfile?.role
            );
          } else {
            console.log('🎯 Using detailed image generation');
            // Detailed mode - use original image generation
            imageToSave = await generateWorkoutImage(
              workout.title,
              workout.description,
              user.uid,
              userProfile?.role
            );
          }
        } catch (imageError) {
          console.error('❌ Image generation failed, continuing without image:', imageError);
          imageToSave = null;
        }
      }
      
      console.log('💾 Calling saveAIWorkout with:', {
        userId: user.uid,
        workoutTitle: workout.title,
        totalTime: totalTimeMinutes,
        teamId: userProfile?.teamId,
        imageToSave: imageToSave ? 'HAS_IMAGE' : 'NO_IMAGE',
        userRole: userProfile?.role
      });
      
      await saveAIWorkout(user.uid, workout, totalTimeMinutes, userProfile?.teamId, imageToSave, userProfile?.role);
      
      console.log('✅ Workout saved successfully!');
      
      // Check and award badges after completing AI workout
      console.log('🏆 Checking for new badges after AI workout...');
      try {
        const newBadges = await checkAndAwardBadges(user.uid);
        if (newBadges && newBadges.length > 0) {
          console.log('🎉 New badges earned:', newBadges);
        }
      } catch (badgeError) {
        console.error('❌ Error checking badges:', badgeError);
      }
      
      Alert.alert(
        'Workout Complete! 🎉',
        `Great job! You completed ${calculateProgress()}% of your AI workout in ${totalTimeMinutes} minutes.`,
        [
          { text: 'Generate New Workout', onPress: () => {
            setWorkout(null);
            setSelectedImage(null); // Clear selected image for next workout
            setSaving(false); // Reset saving state
          }},
          { text: 'Back to Dashboard', onPress: () => {
            setSaving(false); // Reset saving state
            navigation.navigate('My Progress');
          }}
        ]
      );
    } catch (error) {
      setSaving(false); // Reset saving state on error
      Alert.alert('Error', 'Failed to save workout. Please try again.');
      console.error('Save workout error:', error);
    }
  };

  const renderExercise = (exercise, section, key) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.exerciseItem,
        exercise.completed && styles.exerciseCompleted
      ]}
      onPress={() => toggleExerciseComplete(section, exercise.id)}
    >
      <View style={styles.exerciseHeader}>
        <Ionicons
          name={exercise.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={exercise.completed ? '#4CAF50' : '#666'}
        />
        <Text style={[
          styles.exerciseName,
          exercise.completed && styles.exerciseNameCompleted
        ]}>
          {exercise.exercise}
        </Text>
      </View>
      
      <View style={styles.exerciseDetails}>
        {exercise.sets && (
          <Text style={styles.exerciseInfo}>
            {exercise.sets} sets × {exercise.reps}
          </Text>
        )}
        {exercise.duration && (
          <Text style={styles.exerciseInfo}>Duration: {exercise.duration}</Text>
        )}
        {exercise.rest && (
          <Text style={styles.exerciseInfo}>Rest: {exercise.rest}</Text>
        )}
      </View>
      
      <Text style={styles.exerciseDescription}>{exercise.description}</Text>
      
      {exercise.tips && (
        <Text style={styles.exerciseTips}>💡 {exercise.tips}</Text>
      )}
    </TouchableOpacity>
  );

  const renderSection = (title, exercises, section, icon) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={24} color="#2196F3" />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionProgress}>
          {exercises.filter(ex => ex.completed).length}/{exercises.length}
        </Text>
      </View>
      {exercises.map((exercise, index) => renderExercise(exercise, section, `${section}-${index}`))}
    </View>
  );

  const ImageOptionsModal = () => (
    <Modal
      visible={showImageOptions}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={true}
    >
      <View style={styles.imageModalOverlay}>
        <View style={styles.imageModalContainer}>
          <View style={styles.imageModalHeader}>
            <Text style={styles.imageModalTitle}>Workout Image</Text>
            <TouchableOpacity onPress={() => setShowImageOptions(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.imageModalSubtext}>
            Choose how to add an image to your workout
          </Text>
          
          <View style={styles.imageOptionsContainer}>
            <TouchableOpacity style={styles.imageOption} onPress={selectImage}>
              <Ionicons name="images" size={32} color="#2196F3" />
              <Text style={styles.imageOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.imageOption} onPress={takePhoto}>
              <Ionicons name="camera" size={32} color="#2196F3" />
              <Text style={styles.imageOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imageOption} 
              onPress={() => {
                setSelectedImage(null);
                setShowImageOptions(false);
              }}
            >
              <Ionicons name="sparkles" size={32} color="#FF9800" />
              <Text style={styles.imageOptionText}>AI Generated</Text>
              <Text style={styles.imageOptionSubtext}>Let AI create one for you</Text>
            </TouchableOpacity>
          </View>
          
          {selectedImage && (
            <View style={styles.selectedImageContainer}>
              <Text style={styles.selectedImageText}>Selected Image:</Text>
              <Image source={{ uri: selectedImage }} style={styles.selectedImagePreview} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="trash" size={20} color="#FF5722" />
                <Text style={styles.removeImageText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Generating your personalized workout...</Text>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.welcomeContainer}>
          {/* Similar Workout Banner */}
          {sourceWorkout && (
            <View style={styles.similarWorkoutBanner}>
              <Ionicons name="refresh" size={20} color="#007AFF" />
              <Text style={styles.similarWorkoutText}>
                Generating a workout similar to {sourceWorkout}
              </Text>
            </View>
          )}

          <View style={styles.header}>
            <Ionicons name="fitness" size={60} color="#2196F3" />
            <Text style={styles.title}>AI Workout Generator</Text>
            <Text style={styles.subtitle}>
              {userProfile?.role === 'group_member' 
                ? 'Get personalized fitness workouts powered by AI'
                : 'Get personalized hockey workouts powered by AI'
              }
            </Text>
          </View>

          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Quick Start Options:</Text>
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={`${suggestion.focus}-${suggestion.duration}`}
                style={styles.suggestionCard}
                onPress={() => {
                  console.log('🚀 Quick start button pressed:', suggestion.title);
                  console.log('🚀 Current state before quick start:', { 
                    hasWorkout: !!workout, 
                    isLoading: loading, 
                    hasLeftScreen: hasLeftScreenRef.current, 
                    isQuickStartMode 
                  });
                  setIsQuickStartMode(true); // Set quick start mode flag
                  console.log('🚀 Quick start mode set to true');
                  generateNewWorkout({
                    ...preferences,
                    focus: suggestion.focus,
                    duration: suggestion.duration
                  });
                }}
              >
                <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                <Text style={styles.suggestionDescription}>
                  {suggestion.description}
                </Text>
                <Text style={styles.suggestionDuration}>
                  Duration: {suggestion.duration}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.customButton}
            onPress={() => {
              setIsQuickStartMode(false); // Reset quick start mode for custom workout
              setShowPreferences(true);
            }}
          >
            <Ionicons name="settings" size={20} color="#fff" />
            <Text style={styles.customButtonText}>Custom Workout</Text>
          </TouchableOpacity>
        </ScrollView>
        
        <PreferencesModalComponent
          visible={showPreferences}
          onClose={() => setShowPreferences(false)}
          preferences={preferences}
          onUpdatePreference={updatePreference}
          customWorkoutText={customWorkoutText}
          onCustomTextChange={setCustomWorkoutText}
          loading={loading}
          onGenerateWorkout={generateCustomWorkout}
          userProfile={userProfile}
          styles={styles}
        />
        <ImageOptionsModal />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.workoutHeader}>
        <View style={styles.workoutTitleContainer}>
          <Text style={styles.workoutTitle}>
            {workout.title}
          </Text>
          <Text style={styles.workoutMeta}>
            {workout.difficulty} • {workout.estimatedDuration}
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{calculateProgress()}%</Text>
          <Text style={styles.progressLabel}>Complete</Text>
        </View>
      </View>

      <ScrollView style={styles.workoutContent}>
        {workout.warmup.length > 0 && renderSection(
          'Warm-up', workout.warmup, 'warmup', 'flame'
        )}
        
        {workout.mainWorkout.length > 0 && renderSection(
          'Main Workout', workout.mainWorkout, 'mainWorkout', 'barbell'
        )}
        
        {workout.cooldown.length > 0 && renderSection(
          'Cool Down', workout.cooldown, 'cooldown', 'leaf'
        )}
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.newWorkoutButton}
          onPress={() => {
            setIsQuickStartMode(false); // Reset quick start mode
            setWorkout(null);
          }}
        >
          <Text style={styles.newWorkoutButtonText}>New Workout</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.completeButton,
            saving && styles.completeButtonDisabled
          ]}
          onPress={completeWorkout}
          disabled={saving}
        >
          {saving ? (
            <View style={styles.savingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.completeButtonText}>Complete Workout</Text>
          )}
        </TouchableOpacity>
      </View>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  welcomeContainer: {
    padding: 20,
    paddingBottom: 100, // Extra padding to account for tab bar
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  suggestionsContainer: {
    marginBottom: 20,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  suggestionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  suggestionDuration: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 8,
    fontWeight: '500',
  },
  speedSummaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  speedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  speedSummaryText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 8,
    flex: 1,
  },
  customButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  customButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  selectedImageContainer: {
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  selectedImageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  selectedImagePreview: {
    width: 150,
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
  },
  removeImageText: {
    color: '#FF5722',
    marginLeft: 4,
    fontSize: 14,
  },
  // Image Modal Styles
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  imageModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  imageModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  imageModalSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  imageOptionsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  imageOption: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageOptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  imageOptionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  workoutHeader: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 20, // Comfortable spacing
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align to top for better layout
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  workoutTitleContainer: {
    flex: 1,
    marginRight: 16, // Add margin to separate from progress
    maxWidth: '70%', // Ensure title doesn't take more than 70% of width
  },
  workoutTitle: {
    fontSize: 18, // Slightly smaller font
    fontWeight: 'bold',
    color: '#333',
    flexWrap: 'wrap', // Allow text wrapping
  },
  workoutMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80, // Ensure minimum width for progress display
    maxWidth: '25%', // Don't let it take more than 25% of width
    paddingLeft: 10, // Add some left padding
  },
  progressText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  workoutContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 100, // Extra padding to account for tab bar and bottom actions
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  sectionProgress: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exerciseItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  exerciseCompleted: {
    backgroundColor: '#f8f9fa',
    opacity: 0.8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  exerciseInfo: {
    fontSize: 12,
    color: '#2196F3',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  exerciseTips: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 8,
    backgroundColor: '#f1f8e9',
    padding: 8,
    borderRadius: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newWorkoutButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  newWorkoutButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#9E9E9E',
    opacity: 0.7,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalInnerContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalContentContainer: {
    paddingBottom: 40,
  },
  preferenceSection: {
    marginBottom: 24,
  },
  preferenceSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  preferenceSectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },
  customTextInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  customTextInputError: {
    borderColor: '#FF5722',
    backgroundColor: '#ffebee',
  },
  characterCountContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
  },
  characterCountError: {
    color: '#FF5722',
    fontWeight: 'bold',
  },
  preferenceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  preferenceOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
  },
  preferenceOptionText: {
    fontSize: 16,
    color: '#333',
  },
  preferenceOptionTextSelected: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  generateButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  similarWorkoutBanner: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  similarWorkoutText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
});

export default AIWorkoutScreen;
