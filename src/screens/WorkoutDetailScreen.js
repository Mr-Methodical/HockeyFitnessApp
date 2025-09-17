import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { addWorkoutComment, getWorkoutComments, toggleWorkoutLike } from '../services/team';

const { width: screenWidth } = Dimensions.get('window');

const WorkoutDetailScreen = ({ route, navigation }) => {
  const { workout } = route.params;
  const { user, userProfile } = useAuth();
  const { currentTheme } = useTheme();
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Like state
  const [isLiking, setIsLiking] = useState(false);
  const [likes, setLikes] = useState(workout.likes || []);
  const [likeCount, setLikeCount] = useState(workout.likeCount || 0);
  
  // Image modal state
  const [showImageModal, setShowImageModal] = useState(false);

  // Load comments when component mounts
  useEffect(() => {
    console.log('WorkoutDetailScreen - workout object:', workout);
    console.log('WorkoutDetailScreen - workout ID:', workout.id);
    loadComments();
  }, []);

  const navigateToProfile = () => {
    if (!workout.userId || workout.userId === user.uid) {
      // Don't navigate to own profile or if no userId
      return;
    }
    
    navigation.navigate('PlayerProfile', { 
      playerId: workout.userId,
      playerName: workout.userName
    });
  };

  const loadComments = async () => {
    if (!workout.id) return;
    
    try {
      setLoadingComments(true);
      const commentsData = await getWorkoutComments(workout.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !userProfile) return;

    try {
      setSubmittingComment(true);
      
      const commentData = {
        text: newComment.trim(),
        userName: userProfile.name,
        userRole: userProfile.role || 'player'
      };

      const addedComment = await addWorkoutComment(workout.id, commentData, user.uid);
      
      // Add the new comment to the top of the list
      setComments(prev => [addedComment, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLikeToggle = async () => {
    if (isLiking || !user) return;

    try {
      setIsLiking(true);
      
      const result = await toggleWorkoutLike(workout.id, user.uid);
      
      // Update local state immediately for better UX
      if (result.liked) {
        setLikes([...likes, user.uid]);
      } else {
        setLikes(likes.filter(id => id !== user.uid));
      }
      setLikeCount(result.likeCount);
      
    } catch (error) {
      console.error('Error liking workout:', error);
      Alert.alert('Error', 'Failed to like workout. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      // Handle both Firestore timestamp and regular date
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.log('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      // Handle both Firestore timestamp and regular date
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.log('Time formatting error:', error);
      return 'Invalid time';
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'Not specified';
    if (minutes < 60) return `${minutes} minutes`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}m`
      : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const navigateToAIWorkout = () => {
    // Extract workout preferences from the current workout
    const preferences = {
      duration: workout.estimatedDuration || workout.duration + ' minutes',
      focus: extractFocusFromWorkout(workout),
      equipment: workout.equipment ? 
        (Array.isArray(workout.equipment) ? workout.equipment.join(', ').toLowerCase() : workout.equipment.toLowerCase()) : 
        'minimal equipment',
      fitnessLevel: workout.difficulty || 'intermediate'
    };

    // Navigate to AI Workout screen in the tab navigator
    navigation.navigate('PlayerTabs', { 
      screen: 'AI Workout',
      params: { 
        suggestedPreferences: preferences,
        sourceWorkout: workout.userName ? `${workout.userName}'s workout` : 'selected workout'
      }
    });
  };

  const extractFocusFromWorkout = (workout) => {
    const type = workout.type?.toLowerCase() || '';
    const notes = workout.notes?.toLowerCase() || '';
    
    if (type.includes('cardio') || notes.includes('cardio')) return 'cardio endurance';
    if (type.includes('strength') || notes.includes('strength')) return 'strength training';
    if (type.includes('skating') || notes.includes('skating')) return 'speed and agility';
    if (type.includes('flexibility') || notes.includes('stretch')) return 'flexibility/mobility';
    return 'hockey-specific';
  };

  const renderExerciseSection = (title, exercises, iconName) => (
    <View style={styles.exerciseSection} key={title}>
      <View style={styles.exerciseSectionHeader}>
        <MaterialIcons name={iconName} size={24} color={currentTheme.primary} />
        <Text style={styles.exerciseSectionTitle}>{title}</Text>
        <Text style={styles.exerciseCount}>({exercises.length} exercises)</Text>
      </View>
      
      {exercises.map((exercise, index) => (
        <View key={exercise.id || index} style={styles.exerciseItem}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseIconContainer}>
              {exercise.completed ? (
                <Ionicons name="checkmark-circle" size={20} color={currentTheme.success || "#4CAF50"} />
              ) : (
                <Ionicons name="ellipse-outline" size={20} color={currentTheme.textMuted || "#999"} />
              )}
            </View>
            <Text style={[
              styles.exerciseName,
              exercise.completed && styles.exerciseNameCompleted
            ]}>
              {exercise.exercise}
            </Text>
          </View>
          
          {/* Exercise Details */}
          <View style={styles.exerciseDetails}>
            {exercise.sets && (
              <View style={styles.exerciseDetailItem}>
                <Text style={styles.exerciseDetailText}>
                  {exercise.sets} sets × {exercise.reps}
                </Text>
              </View>
            )}
            {exercise.duration && (
              <View style={styles.exerciseDetailItem}>
                <Text style={styles.exerciseDetailText}>
                  Duration: {exercise.duration}
                </Text>
              </View>
            )}
            {exercise.rest && (
              <View style={styles.exerciseDetailItem}>
                <Text style={styles.exerciseDetailText}>
                  Rest: {exercise.rest}
                </Text>
              </View>
            )}
          </View>
          
          {/* Exercise Description */}
          {exercise.description && (
            <Text style={styles.exerciseDescription}>{exercise.description}</Text>
          )}
          
          {/* Exercise Tips */}
          {exercise.tips && (
            <View style={styles.exerciseTipsContainer}>
              <Text style={styles.exerciseTips}>💡 {exercise.tips}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: currentTheme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: currentTheme.surface, borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={currentTheme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.text }]}>Workout Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={[styles.scrollView, { backgroundColor: currentTheme.background }]} showsVerticalScrollIndicator={false}>
        {/* Workout Image */}
        {workout.imageUrl && (
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => setShowImageModal(true)}
            activeOpacity={0.9}
          >
            <Image 
              source={{ uri: workout.imageUrl }} 
              style={styles.workoutImage}
              resizeMode="contain"
            />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand" size={24} color="white" />
            </View>
          </TouchableOpacity>
        )}

        {/* Workout Information */}
        <View style={[styles.infoCard, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.workoutType, { color: currentTheme.text }]}>{workout.type}</Text>
          <Text style={[styles.workoutDate, { color: currentTheme.textSecondary }]}>{formatDate(workout.timestamp)}</Text>
          <Text style={[styles.workoutTime, { color: currentTheme.textSecondary }]}>{formatTime(workout.timestamp)}</Text>
          
          {/* User Info (for coach view) */}
          {workout.userName && workout.userId && (
            <View style={styles.userInfo}>
              <Ionicons name="person" size={16} color={currentTheme.textSecondary || "#666"} />
              <TouchableOpacity 
                style={styles.userNameContainer}
                onPress={() => navigateToProfile()}
                activeOpacity={0.7}
              >
                <Text style={[styles.userName, { color: currentTheme.primary }]}>{workout.userName}</Text>
                <MaterialIcons name="arrow-forward-ios" size={12} color={currentTheme.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Duration */}
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={20} color={currentTheme.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: currentTheme.textSecondary }]}>Duration</Text>
              <Text style={[styles.detailValue, { color: currentTheme.text }]}>{formatDuration(workout.duration)}</Text>
            </View>
          </View>

          {/* Intensity */}
          {workout.intensity && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="flash-outline" size={20} color={currentTheme.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: currentTheme.textSecondary }]}>Intensity</Text>
                <Text style={[styles.detailValue, { color: currentTheme.text }]}>{workout.intensity}/10</Text>
              </View>
            </View>
          )}

          {/* Notes */}
          {workout.notes && (
            <View style={styles.notesSection}>
              <View style={styles.notesHeader}>
                <Ionicons name="document-text-outline" size={20} color={currentTheme.primary} />
                <Text style={[styles.notesLabel, { color: currentTheme.textSecondary }]}>Notes</Text>
              </View>
              <Text style={[styles.notesText, { color: currentTheme.text }]}>{workout.notes}</Text>
            </View>
          )}

          {/* AI Workout Badge */}
          {workout.isAIGenerated && (
            <View style={[styles.aiWorkoutBadge, { backgroundColor: currentTheme.warning || '#FFF3E0' }]}>
              <Ionicons name="bulb" size={16} color={currentTheme.warning || "#FF9800"} />
              <Text style={[styles.aiWorkoutBadgeText, { color: currentTheme.warning || '#FF9800' }]}>AI Generated Workout</Text>
            </View>
          )}

          {/* Generate Similar Workout Button */}
          {workout.userId !== user?.uid && (
            <TouchableOpacity 
              style={[styles.generateSimilarButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => navigateToAIWorkout()}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.generateSimilarButtonText}>Generate Similar Workout</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Exercise Details for AI Workouts */}
        {workout.isAIGenerated && workout.exercises && (
          <View style={[styles.exercisesCard, { backgroundColor: currentTheme.surface }]}>
            <Text style={[styles.exercisesTitle, { color: currentTheme.text }]}>Workout Details</Text>
            
            {/* Workout Summary */}
            {workout.difficulty && (
              <View style={styles.workoutSummary}>
                <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}>Difficulty: </Text>
                <Text style={[styles.summaryValue, { color: currentTheme.text }]}>{workout.difficulty}</Text>
                {workout.estimatedDuration && (
                  <>
                    <Text style={[styles.summaryLabel, { color: currentTheme.textSecondary }]}> • Estimated: </Text>
                    <Text style={[styles.summaryValue, { color: currentTheme.text }]}>{workout.estimatedDuration}</Text>
                  </>
                )}
              </View>
            )}

            {/* Equipment */}
            {workout.equipment && (
              <View style={styles.equipmentSection}>
                <Text style={styles.equipmentLabel}>Equipment needed:</Text>
                <Text style={styles.equipmentText}>
                  {Array.isArray(workout.equipment) ? workout.equipment.join(', ') : workout.equipment}
                </Text>
              </View>
            )}

            {/* Exercise Sections */}
            {workout.exercises.warmup && workout.exercises.warmup.length > 0 && 
              renderExerciseSection('Warm-up', workout.exercises.warmup, 'flame')
            }
            
            {workout.exercises.mainWorkout && workout.exercises.mainWorkout.length > 0 && 
              renderExerciseSection('Main Workout', workout.exercises.mainWorkout, 'fitness-center')
            }
            
            {workout.exercises.cooldown && workout.exercises.cooldown.length > 0 && 
              renderExerciseSection('Cool Down', workout.exercises.cooldown, 'self-improvement')
            }
          </View>
        )}

        {/* Like Section */}
        <View style={styles.likeCard}>
          <TouchableOpacity 
            style={[styles.likeButton, { backgroundColor: currentTheme.surface }]}
            onPress={handleLikeToggle}
            disabled={isLiking}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={likes.includes(user?.uid) ? "thumb-up" : "thumb-up-off-alt"} 
              size={24} 
              color={likes.includes(user?.uid) ? currentTheme.primary : (currentTheme.textSecondary || "#8E8E93")} 
            />
            <Text style={[
              styles.likeButtonText,
              { color: likes.includes(user?.uid) ? currentTheme.primary : (currentTheme.textSecondary || '#8E8E93') }
            ]}>
              {likes.includes(user?.uid) ? 'Liked' : 'Like'}
            </Text>
          </TouchableOpacity>
          
          {likeCount > 0 && (
            <Text style={[styles.likeCountText, { color: currentTheme.textSecondary }]}>
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </Text>
          )}
        </View>

        {/* Comments Section */}
        <View style={[styles.commentsCard, { backgroundColor: currentTheme.surface }]}>
          <Text style={[styles.commentsTitle, { color: currentTheme.text }]}>Comments</Text>
          
          {/* Comments List */}
          {loadingComments ? (
            <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>Loading comments...</Text>
          ) : comments.length > 0 ? (
            comments.map((comment, index) => (
              <View key={index} style={[styles.commentItem, { borderBottomColor: currentTheme.border }]}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentAuthor, { color: currentTheme.text }]}>{comment.userName}</Text>
                  <Text style={[styles.commentRole, { color: currentTheme.textSecondary }]}>
                    {comment.userRole === 'coach' ? '👨‍💼 Coach' : '🏒 Player'}
                  </Text>
                  <Text style={[styles.commentTime, { color: currentTheme.textMuted }]}>
                    {comment.timestamp?.toDate?.()?.toLocaleDateString() || 'Just now'}
                  </Text>
                </View>
                <Text style={[styles.commentText, { color: currentTheme.text }]}>{comment.text}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.noCommentsText, { color: currentTheme.textSecondary }]}>No comments yet. Be the first to comment!</Text>
          )}

          {/* Add Comment Section */}
          <View style={styles.addCommentSection}>
            <TextInput
              style={[styles.commentInput, { backgroundColor: currentTheme.inputBackground || currentTheme.surface, color: currentTheme.text, borderColor: currentTheme.border }]}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              placeholderTextColor={currentTheme.textMuted || '#999'}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.commentButton,
                { backgroundColor: (!newComment.trim() || submittingComment) ? (currentTheme.buttonBackground || '#ccc') : currentTheme.primary }
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || submittingComment}
            >
              <Text style={[styles.commentButtonText, { color: (!newComment.trim() || submittingComment) ? (currentTheme.textMuted || '#999') : '#fff' }]}>
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </Text>
            </TouchableOpacity>
          </View>
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
                source={{ uri: workout.imageUrl }} 
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set dynamically
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    // backgroundColor and borderBottomColor set dynamically
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    // color set dynamically
  },
  placeholder: {
    width: 34, // Same width as back button for centering
  },
  scrollView: {
    flex: 1,
    // backgroundColor set dynamically
  },
  imageContainer: {
    // backgroundColor will match surface theme
    padding: 0,
  },
  workoutImage: {
    width: screenWidth,
    height: screenWidth * 0.75, // 4:3 aspect ratio
    backgroundColor: '#f0f0f0', // Keep this as it's image loading background
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
  infoCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  workoutType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  workoutDate: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  workoutTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailIcon: {
    width: 40,
    alignItems: 'center',
    paddingTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  notesSection: {
    marginTop: 10,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    paddingLeft: 28,
  },
  // Comments styles
  commentsCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  commentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
    marginBottom: 15,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  commentRole: {
    fontSize: 12,
    color: '#007AFF',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  addCommentSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 12,
    minHeight: 80,
  },
  commentButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  commentButtonDisabled: {
    backgroundColor: '#ccc',
  },
  commentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  likeCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  likeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  likeButtonTextActive: {
    color: '#007AFF',
  },
  likeCountText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  // AI Workout specific styles
  aiWorkoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  aiWorkoutBadgeText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 4,
  },
  generateSimilarButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  generateSimilarButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  exercisesCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  exercisesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  workoutSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  equipmentSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  equipmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  equipmentText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  exerciseSection: {
    marginBottom: 20,
  },
  exerciseSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exerciseSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  exerciseCount: {
    fontSize: 12,
    color: '#666',
  },
  exerciseItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseIconContainer: {
    marginRight: 8,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  exerciseNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  exerciseDetailItem: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  exerciseDetailText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  exerciseDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  exerciseTipsContainer: {
    backgroundColor: '#f1f8e9',
    padding: 8,
    borderRadius: 6,
  },
  exerciseTips: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default WorkoutDetailScreen;
