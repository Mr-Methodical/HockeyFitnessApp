import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Dimensions
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

const AIWorkoutDetailScreen = ({ route, navigation }) => {
  const { workout } = route.params;
  const { currentTheme } = useTheme();
  
  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);

  const renderExerciseSection = (title, exercises, icon) => (
    <View style={[styles.section, { backgroundColor: currentTheme.surface }]}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name={icon} size={24} color={currentTheme.primary} />
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>{title}</Text>
      </View>
      {exercises.map((exercise, index) => (
        <View key={index} style={styles.exerciseItem}>
          <View style={styles.exerciseHeader}>
            <MaterialIcons 
              name={exercise.completed ? "check-circle" : "radio-button-unchecked"} 
              size={20} 
              color={exercise.completed ? "#4CAF50" : "#ccc"} 
            />
            <Text style={[
              styles.exerciseName,
              exercise.completed && styles.exerciseCompleted
            ]}>
              {exercise.exercise}
            </Text>
          </View>
          <View style={styles.exerciseDetails}>
            {exercise.sets && (
              <Text style={styles.exerciseInfo}>{exercise.sets} sets × {exercise.reps}</Text>
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
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <View style={[styles.header, { backgroundColor: currentTheme.surface }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={currentTheme.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.headerTitle, { color: currentTheme.text }]}>{workout.title}</Text>
          <View style={styles.aiBadge}>
            <MaterialIcons name="auto-awesome" size={16} color="#fff" />
            <Text style={styles.aiBadgeText}>AI Generated</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {(workout.imageUrl || workout.image) && (
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => setShowImageModal(true)}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri: workout.imageUrl || workout.image }} 
              style={styles.workoutImage} 
              resizeMode="contain"
            />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand" size={24} color="white" />
            </View>
          </TouchableOpacity>
        )}

        <View style={[styles.infoSection, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.description, { color: currentTheme.textSecondary }]}>{workout.description}</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: currentTheme.textMuted }]}>Duration</Text>
              <Text style={[styles.statValue, { color: currentTheme.text }]}>{workout.duration} min</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: currentTheme.textMuted }]}>Difficulty</Text>
              <Text style={[styles.statValue, { color: currentTheme.text }]}>{workout.difficulty}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: currentTheme.textMuted }]}>Completion</Text>
              <Text style={[styles.statValue, { color: currentTheme.text }]}>
                {workout.completedExercises}/{workout.totalExercises}
              </Text>
            </View>
          </View>

          {workout.equipment && (
            <View style={styles.equipmentSection}>
              <Text style={[styles.equipmentTitle, { color: currentTheme.text }]}>Equipment Needed:</Text>
              {Array.isArray(workout.equipment) 
                ? workout.equipment.map((item, index) => (
                    <Text key={index} style={[styles.equipmentItem, { color: currentTheme.textSecondary }]}>• {item}</Text>
                  ))
                : <Text style={[styles.equipmentItem, { color: currentTheme.textSecondary }]}>• {workout.equipment}</Text>
              }
            </View>
          )}
        </View>

        {workout.exercises && (
          <>
            {workout.exercises.warmup && workout.exercises.warmup.length > 0 && 
              renderExerciseSection('Warm-up', workout.exercises.warmup, 'whatshot')
            }
            
            {workout.exercises.mainWorkout && workout.exercises.mainWorkout.length > 0 && 
              renderExerciseSection('Main Workout', workout.exercises.mainWorkout, 'fitness-center')
            }
            
            {workout.exercises.cooldown && workout.exercises.cooldown.length > 0 && 
              renderExerciseSection('Cool Down', workout.exercises.cooldown, 'self-improvement')
            }
          </>
        )}

        <View style={styles.regenerateSection}>
          <TouchableOpacity 
            style={styles.regenerateButton}
            onPress={() => navigation.navigate('PlayerTabs', { screen: 'AI Workout' })}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.regenerateButtonText}>Generate Similar Workout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Full Size Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalBackground}
            onPress={() => setShowImageModal(false)}
          >
            <View style={styles.modalContent}>
              <Image 
                source={{ uri: workout.imageUrl || workout.image }} 
                style={styles.fullSizeImage}
                resizeMode="contain"
              />
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowImageModal(false)}
              >
                <Ionicons name="close-circle" size={40} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  workoutImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  imageOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: -20,
    right: -20,
    zIndex: 1,
  },
  infoSection: {
    padding: 16,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  equipmentSection: {
    marginTop: 16,
  },
  equipmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  equipmentItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  section: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  exerciseItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    marginLeft: 8,
    flex: 1,
  },
  exerciseCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    marginLeft: 28,
  },
  exerciseInfo: {
    fontSize: 12,
    color: '#9C27B0',
    backgroundColor: '#f3e5f5',
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
    marginLeft: 28,
  },
  exerciseTips: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 8,
    marginLeft: 28,
    backgroundColor: '#f1f8e9',
    padding: 8,
    borderRadius: 8,
  },
  regenerateSection: {
    padding: 16,
    marginBottom: 32,
  },
  regenerateButton: {
    backgroundColor: '#9C27B0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  regenerateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AIWorkoutDetailScreen;
