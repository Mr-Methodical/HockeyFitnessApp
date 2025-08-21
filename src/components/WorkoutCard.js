import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { toggleWorkoutLike, deleteWorkout } from '../services/team';

const WorkoutCard = ({ 
  workout, 
  onPress, 
  showPlayerName = false, 
  style = {},
  onLikeUpdate = null, // Callback when like count changes
  onDelete = null, // Callback when workout is deleted
  showDeleteButton = false, // Whether to show delete button for coaches
  navigation = null, // Navigation prop for profile navigation
  currentUserId = null // Current user ID to prevent self-navigation
}) => {
  const { user, userProfile } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState(workout.likes || []);
  const [localLikeCount, setLocalLikeCount] = useState(workout.likeCount || 0);
  const [imageLoadError, setImageLoadError] = useState(false);

  const handlePlayerNamePress = (e) => {
    // Stop event propagation to prevent card press
    e.stopPropagation();
    
    if (!navigation || !workout.userId || workout.userId === currentUserId) {
      return; // Don't navigate to own profile or if no navigation provided
    }
    
    navigation.navigate('PlayerProfile', { 
      playerId: workout.userId,
      playerName: workout.userName
    });
  };

  const handleLikePress = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);
      
      const result = await toggleWorkoutLike(workout.id, user.uid);
      
      // Update local state immediately for better UX
      if (result.liked) {
        setLocalLikes([...localLikes, user.uid]);
      } else {
        setLocalLikes(localLikes.filter(id => id !== user.uid));
      }
      setLocalLikeCount(result.likeCount);
      
      // Call the callback if provided
      if (onLikeUpdate) {
        onLikeUpdate(workout.id, result.likeCount, result.liked);
      }
      
    } catch (error) {
      console.error('Error liking workout:', error);
      Alert.alert('Error', 'Failed to like workout. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkout(workout.id, user.uid, userProfile.teamId);
              if (onDelete) {
                onDelete(workout.id);
              }
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', `Failed to delete workout: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const userHasLiked = localLikes.includes(user.uid);

  return (
    <TouchableOpacity 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.workoutInfo}>
          {showPlayerName && workout.userName && (
            <TouchableOpacity 
              onPress={handlePlayerNamePress}
              style={styles.playerNameContainer}
              activeOpacity={0.7}
            >
              <Text style={styles.playerName}>{workout.userName}</Text>
              {navigation && workout.userId && workout.userId !== currentUserId && (
                <MaterialIcons name="arrow-forward-ios" size={12} color="#007AFF" style={styles.playerNameArrow} />
              )}
            </TouchableOpacity>
          )}
          <View style={styles.typeContainer}>
            <Text style={styles.workoutType}>{workout.type}</Text>
            {workout.isAIGenerated && (
              <View style={styles.aiBadge}>
                <MaterialIcons name="auto-awesome" size={12} color="#fff" />
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            )}
          </View>
          <Text style={styles.duration}>{workout.duration} minutes</Text>
        </View>
        <Text style={styles.timestamp}>{formatDate(workout.timestamp)}</Text>
      </View>

      {workout.notes && (
        <Text style={styles.notes} numberOfLines={3}>
          {workout.notes}
        </Text>
      )}

      {(workout.imageUrl || workout.image) && !imageLoadError && (
        <Image 
          source={{ uri: workout.imageUrl || workout.image }} 
          style={styles.workoutImage}
          onError={(error) => {
            console.log('Image load error for workout:', workout.id, 'URL:', workout.imageUrl || workout.image, 'Error:', error.nativeEvent.error);
            setImageLoadError(true);
          }}
          onLoad={() => {
            console.log('Image loaded successfully for workout:', workout.id);
            setImageLoadError(false);
          }}
        />
      )}

      {imageLoadError && workout.hasAIImage && (
        <View style={styles.imageErrorContainer}>
          <MaterialIcons name="broken-image" size={48} color="#ccc" />
          <Text style={styles.imageErrorText}>AI image expired</Text>
          <Text style={styles.imageErrorSubtext}>This image was temporarily generated and is no longer available</Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={handleLikePress}
          disabled={isLiking}
          activeOpacity={0.7}
        >
          <MaterialIcons 
            name={userHasLiked ? "thumb-up" : "thumb-up-off-alt"} 
            size={20} 
            color={userHasLiked ? "#007AFF" : "#8E8E93"} 
          />
          <Text style={[
            styles.likeCount,
            userHasLiked && styles.likeCountActive
          ]}>
            {localLikeCount}
          </Text>
        </TouchableOpacity>

        {workout.commentCount > 0 && (
          <View style={styles.commentsIndicator}>
            <MaterialIcons name="comment" size={16} color="#8E8E93" />
            <Text style={styles.commentCount}>{workout.commentCount}</Text>
          </View>
        )}

        {showDeleteButton && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="delete-outline" 
              size={20} 
              color="#FF3B30" 
            />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  playerNameArrow: {
    marginLeft: 4,
  },
  workoutType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    color: '#8E8E93',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
  },
  notes: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 12,
  },
  workoutImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F2F2F7',
  },
  imageErrorContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  imageErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 8,
  },
  imageErrorSubtext: {
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F8F9FA',
  },
  likeCount: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  likeCountActive: {
    color: '#007AFF',
  },
  commentsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentCount: {
    marginLeft: 4,
    fontSize: 12,
    color: '#8E8E93',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9C27B0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default WorkoutCard;
