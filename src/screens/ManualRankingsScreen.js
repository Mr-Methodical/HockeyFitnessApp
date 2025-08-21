import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { updateTeamSettings } from '../services/team';
import { getBasicTeamMembers, getBasicTeam } from '../services/basicFirestore';

const ManualRankingsScreen = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);

  // Get team data from route params if available
  const passedTeamData = route.params?.teamData;
  const onRankingsUpdated = route.params?.onRankingsUpdated;

  useEffect(() => {
    fetchPlayersAndRankings();
  }, []);

  const fetchPlayersAndRankings = async () => {
    try {
      setLoading(true);
      
      if (!userProfile?.teamId) {
        throw new Error('No team ID found for user');
      }
      
      console.log('Fetching team data for rankings, team ID:', userProfile.teamId);
      
      // Use passed team data if available, otherwise fetch it
      let teamData = passedTeamData;
      if (!teamData) {
        teamData = await getBasicTeam(userProfile.teamId);
        console.log('Team data fetched for rankings:', teamData);
      } else {
        console.log('Using passed team data for rankings:', teamData);
      }
      
      if (!teamData) {
        throw new Error('Team data not found');
      }
      
      // Safely get existing rankings with fallback and ensure it's an array
      let existingRankings = [];
      if (teamData.manualRankings) {
        if (Array.isArray(teamData.manualRankings)) {
          existingRankings = teamData.manualRankings;
        } else {
          console.warn('manualRankings is not an array, converting:', teamData.manualRankings);
          existingRankings = [];
        }
      }
      console.log('Existing rankings:', existingRankings);
      
      // Get all team members
            const teamMembers = await getBasicTeamMembers(userProfile.teamId);
      console.log('Team members received:', teamMembers.length);
      
      const playerMembers = teamMembers.filter(member => member.role === 'player');
      console.log('Player members filtered:', playerMembers.length);
      
      // Sort players according to existing manual rankings
      const sortedPlayers = [...playerMembers];
      if (existingRankings.length > 0) {
        sortedPlayers.sort((a, b) => {
          const aIndex = existingRankings.indexOf(a.id);
          const bIndex = existingRankings.indexOf(b.id);
          
          // If both are in rankings, sort by their position
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          // If only a is in rankings, a comes first
          if (aIndex !== -1) return -1;
          // If only b is in rankings, b comes first
          if (bIndex !== -1) return 1;
          // If neither is in rankings, maintain original order
          return 0;
        });
      }
      
      console.log('Sorted players:', sortedPlayers.length);
      setPlayers(sortedPlayers);
    } catch (error) {
      console.error('Error fetching players and rankings:', error);
      Alert.alert('Error', `Failed to load player data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const movePlayer = (fromIndex, toIndex) => {
    const updatedPlayers = [...players];
    const [movedPlayer] = updatedPlayers.splice(fromIndex, 1);
    updatedPlayers.splice(toIndex, 0, movedPlayer);
    setPlayers(updatedPlayers);
  };

  const handleSaveRankings = async () => {
    try {
      setSaving(true);
      
      // Create array of player IDs in their new order
      const manualRankings = players.map(player => player.id);
      console.log('Saving manual rankings:', manualRankings);
      console.log('Player order:', players.map(p => ({ id: p.id, name: p.name })));
      
      await updateTeamSettings(userProfile.teamId, {
        manualRankings,
        rankingMode: 'manual' // Ensure we're in manual mode
      });
      
      console.log('Manual rankings saved successfully');
      
      // Call the callback to refresh the leaderboard
      if (onRankingsUpdated) {
        onRankingsUpdated();
      }
      
      Alert.alert('Success', 'Player rankings updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error updating rankings:', error);
      Alert.alert('Error', 'Failed to update player rankings');
    } finally {
      setSaving(false);
    }
  };

  const renderPlayerItem = (player, index) => {
    return (
      <View key={player.id} style={styles.playerItem}>
        <View style={styles.rankNumber}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>
        
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerEmail}>{player.email}</Text>
        </View>
        
        <View style={styles.dragControls}>
          <TouchableOpacity
            style={[styles.dragButton, index === 0 && styles.dragButtonDisabled]}
            onPress={() => index > 0 && movePlayer(index, index - 1)}
            disabled={index === 0}
          >
            <MaterialIcons 
              name="keyboard-arrow-up" 
              size={24} 
              color={index === 0 ? '#C7C7CC' : '#007AFF'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.dragButton, index === players.length - 1 && styles.dragButtonDisabled]}
            onPress={() => index < players.length - 1 && movePlayer(index, index + 1)}
            disabled={index === players.length - 1}
          >
            <MaterialIcons 
              name="keyboard-arrow-down" 
              size={24} 
              color={index === players.length - 1 ? '#C7C7CC' : '#007AFF'} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading player rankings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Manual Player Rankings</Text>
            <Text style={styles.headerSubtitle}>
              Tap the arrows to reorder players. Rankings will be displayed on the leaderboard.
            </Text>
          </View>
        </View>

        <ScrollView style={styles.playersList}>
          {players.map((player, index) => renderPlayerItem(player, index))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveRankings}
            disabled={saving}
          >
            {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Rankings</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7', // Match the app background
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
    marginTop: 2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  playersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rankNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  playerEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  dragControls: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  dragButton: {
    padding: 4,
  },
  dragButtonDisabled: {
    opacity: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManualRankingsScreen;
